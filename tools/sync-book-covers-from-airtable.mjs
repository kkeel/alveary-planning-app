/**
 * Publish stable WebP covers from Airtable to this app's GitHub Pages assets.
 * Only known 2027–28 public-catalog resource IDs are allowed.
 * Airtable signed attachment URLs are never stored in the repository.
 */
import { readFile, writeFile, mkdir, mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec=promisify(execFile);
const token=process.env.AIRTABLE_PAT;
const baseId=process.env.AIRTABLE_BASE_ID || "appzITUxxmM6cO5m1";
const root=process.cwd();
const outDir=join(root,"public","book-covers");
const manifestPath=join(outDir,"manifest.json");
const mapPath=join(root,"app","books","book-cover-map.json");
if(!token){console.error("AIRTABLE_PAT is required to sync book covers.");process.exit(1);}
if(!/^app[A-Za-z0-9]{14}$/.test(baseId))throw Error("Invalid Airtable base ID");

const catalog=JSON.parse(await readFile(join(root,"app","books","catalog-resources-preview.json"),"utf8"));
const wanted=new Set(catalog.resources.map(resource=>resource.id));
const coverMap=JSON.parse(await readFile(mapPath,"utf8"));
let manifest={};
try{manifest=JSON.parse(await readFile(manifestPath,"utf8"));}catch{}
await mkdir(outDir,{recursive:true});
const tmp=await mkdtemp(join(tmpdir(),"alveary-covers-"));
const exists=async file=>{try{await access(file);return true;}catch{return false;}};

async function fetchRetry(url,options={},attempt=0){
  const response=await fetch(url,options);
  if((response.status===429||response.status>=500)&&attempt<4){
    const seconds=Math.max(1,Math.min(10,Number(response.headers.get("retry-after"))||2*(attempt+1)));
    await new Promise(resolve=>setTimeout(resolve,seconds*1000));
    return fetchRetry(url,options,attempt+1);
  }
  if(!response.ok)throw Error("HTTP "+response.status+" from "+new URL(url).hostname);
  return response;
}
async function readImages(){
  const found=new Map();let offset;
  do{
    const url=new URL("https://api.airtable.com/v0/"+baseId+"/MA%20Library");
    url.searchParams.set("pageSize","100");
    url.searchParams.append("fields[]","Image");
    if(offset)url.searchParams.set("offset",offset);
    const response=await fetchRetry(url.toString(),{headers:{Authorization:"Bearer "+token}});
    const page=await response.json();
    for(const record of page.records||[])if(wanted.has(record.id))found.set(record.id,record);
    offset=page.offset;
  }while(offset);
  return found;
}
const stats={unchanged:0,updated:0,withoutImage:0,missingRecord:0,failed:[]};
try{
  const images=await readImages();
  for(const id of wanted){
    const record=images.get(id);
    if(!record){stats.missingRecord++;continue;}
    const attachment=record.fields?.Image?.[0];
    if(!attachment?.url||!attachment?.id){stats.withoutImage++;continue;}
    const dest=join(outDir,id+".webp");
    if(manifest[id]?.attachmentId===attachment.id&&await exists(dest)){stats.unchanged++;continue;}
    const tempIn=join(tmp,id+".input"),tempOut=join(tmp,id+".webp");
    try{
      const response=await fetchRetry(attachment.url);
      const data=Buffer.from(await response.arrayBuffer());
      if(data.byteLength>20_000_000)throw Error("Attachment too large");
      await writeFile(tempIn,data);
      await exec("convert",[
        tempIn+"[0]","-auto-orient","-thumbnail","160x220",
        "-background","white","-gravity","center",
        "-extent","160x220","-strip","-quality","80",tempOut
      ]);
      await writeFile(dest,await readFile(tempOut));
      manifest[id]={attachmentId:attachment.id,updatedAt:new Date().toISOString()};
      stats.updated++;
    }catch(error){stats.failed.push({id,reason:String(error.message).slice(0,120)});}
  }
  const available=[];
  for(const id of wanted)if(await exists(join(outDir,id+".webp")))available.push(id);
  coverMap.newCoverIds=available.sort();
  await writeFile(mapPath,JSON.stringify(coverMap,null,2)+"\n");
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify({...stats,available:available.length,total:wanted.size}));
  if(stats.failed.length)process.exitCode=1;
}finally{await rm(tmp,{recursive:true,force:true});}

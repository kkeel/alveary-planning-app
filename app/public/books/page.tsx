// Public preview route. The real public Book List will be built separately
// from member book selections and requires no Memberstack authentication.
export default function PublicBooksPage() {
  return <>
    <h1>Book List</h1>
    <p className="lead">Explore living books and resources for your school year.</p>
    <div className="notice">
      Public book browsing is coming soon. You do not need to sign in to view this page.
    </div>
  </>;
}

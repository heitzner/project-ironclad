import Footer from './Footer.jsx'
import Navbar from './Navbar.jsx'

function PageLayout({ children, role = 'public', user = null }) {
  return (
    <div className="flex min-h-screen flex-col bg-pageBg">
      <Navbar role={role} user={user} />
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-4 p-main">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default PageLayout

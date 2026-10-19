import Footer from './Footer.jsx'
import Navbar from './Navbar.jsx'

function PageLayout({ children, role = 'public', user = null, fullWidth = false, navigationLinks, homeTo, onSignOut }) {
  // Booking supplies its own main landmark and responsive content padding.
  const Content = fullWidth ? 'div' : 'main'

  return (
    <div className="flex min-h-svh flex-col bg-pageBg">
      <Navbar role={role} user={user} navigationLinks={navigationLinks} homeTo={homeTo} onSignOut={onSignOut} />
      <Content className={fullWidth ? 'student-layout-booking flex flex-1 flex-col pt-16' : 'mx-auto flex w-full max-w-content flex-1 flex-col gap-4 p-main'}>
        {children}
      </Content>
      <Footer />
    </div>
  )
}

export default PageLayout

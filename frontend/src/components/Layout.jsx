import Sidebar from './Sidebar'
import Header from './Header'

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen font-sans bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Sidebar Container */}
      <div className="relative">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-r-3xl shadow-2xl border-r border-gray-800 py-2 backdrop-blur-sm">
          <Sidebar />
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-tl-3xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        {/* Header */}
        <div className="relative z-10">
          <Header />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 p-6 relative z-10 overflow-y-auto">
          <div className="animate-fadeIn">
            {children}
          </div>
        </main>
        
        {/* Bottom Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
      </div>
    </div>
  )
}

export default Layout

import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'
import TabBar from './components/TabBar'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <TabBar />
    </div>
  )
}

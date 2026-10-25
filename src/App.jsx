import { Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import RequireAuth from './components/RequireAuth';
import Account from './pages/Account';
import BookFlight from './pages/BookFlight';
import BookingDetail from './pages/BookingDetail';
import Home from './pages/Home';
import Login from './pages/Login';
import MyBookings from './pages/MyBookings';
import NotFound from './pages/NotFound';
import SearchResults from './pages/SearchResults';

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/login" element={<Login mode="login" />} />
          <Route path="/signup" element={<Login mode="signup" />} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/flights/:id" element={<RequireAuth><BookFlight /></RequireAuth>} />
          <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
          <Route path="/bookings/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">SkyBook · demo airline, no real payments</footer>
    </>
  );
}

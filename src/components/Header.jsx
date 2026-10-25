import { Link, NavLink } from 'react-router-dom';
import { useSession } from '../lib/auth';

export default function Header() {
  const { data: session, isPending } = useSession();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">SkyBook</Link>
        <nav className="nav">
          <NavLink to="/" end>Search</NavLink>
          <NavLink to="/bookings">My bookings</NavLink>
          {!isPending && (session
            ? <NavLink to="/account">{session.user.name}</NavLink>
            : <><NavLink to="/login">Sign in</NavLink><NavLink to="/signup">Sign up</NavLink></>)}
        </nav>
      </div>
    </header>
  );
}

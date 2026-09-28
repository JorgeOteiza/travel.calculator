import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer>
      <p>
        &copy; {new Date().getFullYear()} Travel Calculator. All rights
        reserved.
      </p>
    </footer>
  );
};

export default Footer;

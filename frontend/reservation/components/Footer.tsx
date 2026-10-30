const Footer = () => (
  <footer className="border-t py-6 pb-24 text-center text-sm text-muted-foreground sm:pb-6">
    © {new Date().getFullYear().toLocaleString("fa-IR", { useGrouping: false })} آرایشگاه مردانه خط کج. همه حقوق محفوظ است.
  </footer>
);

export default Footer;

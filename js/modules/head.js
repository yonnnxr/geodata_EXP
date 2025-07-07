const resources = [
  { href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap', rel: 'stylesheet' },
  { href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css', rel: 'stylesheet' }
];

resources.forEach(res => {
  if (!document.querySelector(`link[href="${res.href}"]`)) {
    const link = document.createElement('link');
    link.rel = res.rel;
    link.href = res.href;
    document.head.prepend(link);
  }
}); 
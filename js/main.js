(function () {
  var menuButton = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  var year = document.getElementById('year');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (menuButton && nav) {
    menuButton.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();

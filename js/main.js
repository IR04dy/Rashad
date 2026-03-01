(function () {
  var menuButton = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  var year = document.getElementById('year');
  var header = document.querySelector('.site-header');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function getScrollOffset() {
    var headerHeight = header ? header.offsetHeight : 0;
    return headerHeight + 10;
  }

  function scrollToHash(hash, behavior) {
    if (!hash || hash.charAt(0) !== '#') return;
    var target = document.querySelector(hash);
    if (!target) return;

    var top = target.getBoundingClientRect().top + window.pageYOffset - getScrollOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: behavior || 'smooth'
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      var href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      scrollToHash(href, 'smooth');
      history.replaceState(null, '', href);
    });
  });

  if (window.location.hash) {
    window.setTimeout(function () {
      scrollToHash(window.location.hash, 'auto');
    }, 0);
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

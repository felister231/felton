// Show the button after scrolling
const backToTopBtn = document.getElementById('backToTop');

window.onscroll = function () {
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    backToTopBtn.style.display = "block";
  } else {
    backToTopBtn.style.display = "none";
  }
};

// Scroll back to top on click
backToTopBtn.onclick = function () {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};
// FAQ Accordion
const questions = document.querySelectorAll('.faq-question');

questions.forEach(question => {
  question.addEventListener('click', () => {
    const answer = question.nextElementSibling;
    answer.style.display = (answer.style.display === 'block') ? 'none' : 'block';
  });
});

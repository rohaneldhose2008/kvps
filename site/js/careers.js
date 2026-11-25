/* Careers page: mobile menu + job application sent to the company WhatsApp */
(() => {
  const $ = s => document.querySelector(s);
  $("#year").textContent = new Date().getFullYear();

  const nav = $("#nav"), burger = $("#burger");
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("is-open"); burger.classList.remove("is-open"); document.body.style.overflow = "";
  }));

  const WA_NUMBER = "919496334344";
  const msg = $("#careerMsg");
  const form = $("#careerForm");

  // "Apply for …" buttons pick that role in the form and jump to it
  document.querySelectorAll(".job__apply").forEach(b => b.addEventListener("click", () => {
    form.elements.position.value = b.dataset.role;
    msg.textContent = ""; msg.classList.remove("is-error");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
  }));
  // open with a role already chosen, e.g. kvpsons.com/careers#senior-engineer
  const fromHash = document.getElementById(location.hash.slice(1));
  if (fromHash && fromHash.classList.contains("job")) form.elements.position.value = fromHash.querySelector(".job__apply").dataset.role;
  $("#careerForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target.elements;
    const years = +f.experience.value;
    const min = +f.position.selectedOptions[0].dataset.min || 0;
    if (years < min) {
      msg.classList.add("is-error");
      msg.textContent = `${f.position.value} needs at least ${min} years of building construction experience.`;
      f.experience.focus();
      return;
    }
    const lines = [
      "Hello K V Paulose and Sons, I would like to apply for the " + f.position.value + " job.",
      "Name: " + f.name.value.trim(),
      "Phone: " + f.phone.value.trim(),
      "Building experience: " + years + " years",
      "Qualification: " + f.qualification.value.trim(),
      "Current location: " + f.location.value.trim()
    ];
    if (f.email.value.trim()) lines.push("Email: " + f.email.value.trim());
    if (f.message.value.trim()) lines.push("Message: " + f.message.value.trim());
    window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
    msg.classList.remove("is-error");
    msg.textContent = "Opening WhatsApp. Just press send. You can attach your CV there too.";
    e.target.reset();
  });
})();

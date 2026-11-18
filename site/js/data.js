/* =========================================================
   EDIT YOUR CONTENT HERE
   ========================================================= */

// Stock photo helper (Unsplash, free licence). Replace with your own
// project photos later, e.g. "images/gallery/site-01.jpg".
const U = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

window.SITE_DATA = {
  team: [
    { photo: "images/team/team-1.jpeg", name: "Paily Yoyak",           role: "Founder · 1884 – 1971" },
    { photo: "images/team/team-2.jpeg", name: "K U Paily",             role: "PWD Contractor · 1950" },
    { photo: "images/team/team-3.jpeg", name: "K U John",              role: "PWD Contractor · 1950" },
    { photo: "images/team/team-4.jpeg", name: "K P Yoyaki",            role: "Class A Govt. Contractor" },
    { photo: "images/team/team-5.jpeg", name: "K P Varghese",          role: "Class A Govt. Contractor" },
    { photo: "images/team/team-6.jpeg", name: "K V Paulose",           role: "Managing Director" },
    { photo: "images/team/team-7.jpeg", name: "K U Paulosekutty",      role: "Class A Govt. Contractor" },
    { photo: "images/team/team-8.jpeg", name: "Amal Paul Kunnel",      role: "Next Generation" },
    { photo: "images/team/team-9.jpeg", name: "Sharath Paul Kunnel",   role: "Next Generation" }
  ],

  clients: Array.from({ length: 18 }, (_, i) =>
    `images/clients/client-${String(i + 1).padStart(2, "0")}.jpeg`),

  // Gallery: cat = buildings | roads | bridges
  gallery: [
    { src: U("1541888946425-d81bb19240f5"), cat: "buildings", title: "Site team briefing" },
    { src: U("1503708928676-1cb796a0891e"), cat: "roads",     title: "Earthworks" },
    { src: U("1559843788-693858bf7338"),    cat: "bridges",   title: "Bridge deck" },
    { src: U("1535732759880-bbd5c7265e3f"), cat: "buildings", title: "Tower crane" },
    { src: U("1575281923032-f40d94ef6160"), cat: "roads",     title: "Excavation & haulage" },
    { src: U("1508450859948-4e04fabaa4ea"), cat: "buildings", title: "Concrete frame" },
    { src: U("1529926691761-20fb82067c71"), cat: "bridges",   title: "River crossing" },
    { src: U("1587582423116-ec07293f0395"), cat: "buildings", title: "Structural works" },
    { src: U("1517089596392-fb9a9033e05b"), cat: "roads",     title: "Heavy equipment" },
    { src: U("1485083269755-a7b559a4fe5e"), cat: "buildings", title: "High-rise construction" },
    { src: U("1633363961301-4f100a78e92d"), cat: "bridges",   title: "Long-span bridge" },
    { src: U("1504307651254-35680f356dfd"), cat: "buildings", title: "On-site engineering" },
    { src: U("1534097575056-ddba81f714c8"), cat: "roads",     title: "Road base preparation" },
    { src: U("1579847188804-ecba0e2ea330"), cat: "buildings", title: "Evening shift" },
    { src: U("1583024011792-b165975b52f5"), cat: "roads",     title: "Excavator at work" },
    { src: U("1599707254554-027aeb4deacd"), cat: "buildings", title: "Crane lift" }
  ]
};

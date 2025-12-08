/* --------------------------- INJECT CSS -----------------------------*/
const style = document.createElement("style");
style.innerHTML = `
#ai-chatbot { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: Arial, sans-serif; }
#chatToggleBtn { background: #5D8736; color: white; border: none; padding: 16px; border-radius: 50%; font-size: 24px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
#chatBox { display: none; position: absolute; bottom: 60px; right: 0; width: 400px; height: 600px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden; flex-direction: column; }
#chatBox.open { display: flex; }
#chatBox > div:first-child { background: #5D8736; color: white; padding: 10px; text-align: center; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
#chatMessages { flex: 1; overflow-y: auto; padding: 10px; font-size: 14px; }
#chatFooter { display: none; padding: 8px; }
#chatInput { width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #ccc; }
#chatImage { margin-top: 5px; width: 100%; }
#sendBtn { margin-top: 5px; background: #5D8736; color: white; padding: 6px; width: 100%; border: none; border-radius: 6px; cursor: pointer; }
button.option-btn { padding: 6px; width: 100%; margin-top: 5px; border: none; border-radius: 6px; background: #eef1f7; cursor: pointer; }
button.option-btn:hover { background: #dbe6f0; }
`;
document.head.appendChild(style);

/* --------------------------- INJECT HTML -----------------------------*/
const container = document.createElement("div");
container.id = "ai-chatbot";
container.innerHTML = `
<button id="chatToggleBtn">💬</button>
<div id="chatBox">
  <div>🌿 AgriDirect Assistant</div>
  <div id="chatMessages">
    <p><b>🤖 AI:</b> Welcome! Choose a mode to begin:</p>
    <div id="startButtons"></div>
  </div>
  <div id="chatFooter">
    <input type="text" id="chatInput" placeholder="Ask anything...">
    <input type="file" id="chatImage">
    <button id="sendBtn">Send</button>
  </div>
</div>
`;
document.body.appendChild(container);

/* --------------------------- BASIC SETUP -----------------------------*/
const chatToggleBtn = document.getElementById("chatToggleBtn");
const chatBox = document.getElementById("chatBox");
const chatMessages = document.getElementById("chatMessages");
const chatFooter = document.getElementById("chatFooter");
const startButtons = document.getElementById("startButtons");
const chatInput = document.getElementById("chatInput");
const chatImage = document.getElementById("chatImage");
const sendBtn = document.getElementById("sendBtn");

let MODE = ""; // "guided" or "ai"
let USER_ROLE = "";

/* --------------------------- TOGGLE CHAT -----------------------------*/
chatToggleBtn.onclick = () => {
  chatBox.classList.toggle("open");
  localStorage.setItem("chatOpen", chatBox.classList.contains("open") ? "yes" : "no");
};
if (localStorage.getItem("chatOpen") === "yes") chatBox.classList.add("open");

/* --------------------------- INITIAL BUTTONS -----------------------------*/
function loadStartButtons() {
  startButtons.innerHTML = `
    <button onclick="chooseGuided()" style="background:#e5f5e0;padding:8px;width:100%;margin-top:5px;border:none;border-radius:6px;">🌾 Website Guided Help</button>
    <button onclick="chooseAI()" style="background:#d7e8ff;padding:8px;width:100%;margin-top:5px;border:none;border-radius:6px;">🤖 AI Chat Mode</button>
  `;
}
loadStartButtons();

/* --------------------------- MODE CHOOSING -----------------------------*/
function chooseGuided() {
  MODE = "guided";
  chatMessages.innerHTML += `<p><b>🤖 AI:</b> Choose your role:</p>`;
  showRoleButtons();
  scrollToBottom();
}

function chooseAI() {
  MODE = "ai";
  chatMessages.innerHTML += `<p><b>🤖 AI:</b> You are now in AI mode. Ask anything or send an image!</p>`;
  startButtons.remove();
  chatFooter.style.display = "block";
  scrollToBottom();
}

/* --------------------------- ROLE SELECTION -----------------------------*/
function showRoleButtons() {
  chatMessages.innerHTML += `
    <div id="roleButtons">
      <button onclick="setRole('Farmer')" style="padding:6px;width:100%;margin-top:5px;border:none;border-radius:6px;background:#f2ffe6;">👨‍🌾 Farmer</button>
      <button onclick="setRole('Distributor')" style="padding:6px;width:100%;margin-top:5px;border:none;border-radius:6px;background:#e6f7ff;">🚚 Distributor</button>
      <button onclick="setRole('Retailer')" style="padding:6px;width:100%;margin-top:5px;border:none;border-radius:6px;background:#fff5e6;">🏪 Retailer</button>
      <button onclick="setRole('Consumer')" style="padding:6px;width:100%;margin-top:5px;border:none;border-radius:6px;background:#fce4ec;">🧑‍🤝‍🧑 Consumer</button>
    </div>
  `;
  scrollToBottom();
}

function setRole(role) {
  USER_ROLE = role;
  document.getElementById("roleButtons").remove();
  chatMessages.innerHTML += `<p><b>👉 Selected Role:</b> ${role}</p>`;
  chatMessages.innerHTML += `<p><b>🤖 AI:</b> Choose what you need help with:</p>`;
  showGuidedQuestions(role);
  scrollToBottom();
}

/* --------------------------- GUIDED OPTIONS PER ROLE -----------------------------*/
const options = {
  Farmer: [
    "How do I register as a farmer?",
    "What documents do I need to upload?",
    "Why is my registration not approved?",
    "How long does admin verification take?",
    "How do I upload crop details?",
    "What information is needed for crop data?",
    "How to enter soil pH, minerals, and pesticides?",
    "What type of photos/videos are required?",
    "How to set crop price?",
    "How do I select a distributor?",
    "What if my distributor request is rejected?",
    "How to change distributor?",
    "How do I know my crop is sold?",
    "What is my Farmer ID?",
    "What is Crop ID?",
    "How is QR code generated?",
    "When will I receive payment?",
    "Where can I see my transaction history?",
    "My image is not uploading.",
    "My video is not uploading.",
    "I cannot submit the crop form.",
    "Internet issue while uploading."
  ],
  Distributor: [
    "How do I register as a distributor?",
    "Why is my verification pending?",
    "What ID proof do I need?",
    "How do I view available crops?",
    "How to check crop quality?",
    "How to checkout and purchase?",
    "How to handle rejected crop?",
    "How do I log processing details?",
    "How do I use cold storage information?",
    "How to update transportation details?",
    "How to send product to retailers?",
    "When do I pay the farmer?",
    "How do I receive payment from the retailer?",
    "Where is my invoice?",
    "I can’t open farmer photos/videos.",
    "I am unable to update logistics details.",
    "My purchase is not showing in dashboard."
  ],
  Retailer: [
    "How do I register as a retailer?",
    "Why is admin approval required?",
    "How to purchase from distributor?",
    "How to compare price and quality?",
    "How to check crop certificates?",
    "How do I update arrival details?",
    "How do I log cold storage duration?",
    "How to check product freshness?",
    "How do I generate final consumer QR?",
    "What if QR is not showing?",
    "How do I pay the distributor?",
    "Where is my purchase history?",
    "Cold storage temperature is not saving.",
    "Barcode/QR not scanning.",
    "Media files not uploading."
  ],
  Consumer: [
    "How do I verify product using QR?",
    "What details can I see in the QR?",
    "Can I trust this information?",
    "How do I submit feedback?",
    "How is my feedback used?",
    "How does AgriDirect ensure transparency?",
    "What is blockchain in this system?",
    "Why is the product priced this way?",
    "QR is not scanning.",
    "Details are not loading.",
    "I cannot submit feedback."
  ]
};

function showGuidedQuestions(role) {
  const html = `<div id="guidedOptions">` + 
    options[role].map(opt => 
      `<button onclick="guidedAnswer('${opt}')" style="padding:6px;width:100%;margin-top:5px;border:none;border-radius:6px;background:#eef1f7;">
        ${opt}
      </button>`
    ).join('') + `</div>`;
  chatMessages.innerHTML += html;
  scrollToBottom();
}

// ----------------------------- ANSWERS ------------------------------
const answers = {
  // FARMER ANSWERS
  "How do I register as a farmer?": 
    "Go to AgriDirect → Sign Up → Select Farmer → Fill details → Upload Aadhaar/land documents → Submit for admin verification.",

  "What documents do I need to upload?": 
    "You must upload Aadhaar/PAN, farmland proof (ownership or lease), and optional farmer certificate.",

  "Why is my registration not approved?":
    "Your documents may be unclear or mismatched. Recheck and upload correct ones.",

  "How long does admin verification take?":
    "Usually 24–48 hours.",

  "How do I upload crop details?":
    "Dashboard → Add Crop → Fill crop info → Upload images/videos → Submit.",

  "What information is needed for crop data?":
    "Crop name, variety, quantity, soil pH, minerals, pesticides, harvest date, and media.",

  "How to enter soil pH, minerals, and pesticides?":
    "Enter exact values from your soil test report.",

  "What type of photos/videos are required?":
    "Clear crop images and a 10–20 sec farm video showing crop condition.",

  "How to set crop price?":
    "You can set price based on mandi rate, quality, and demand.",

  "How do I select a distributor?":
    "Open your crop → Click 'Choose Distributor' → Select one and send request.",

  "What if my distributor request is rejected?":
    "Choose a different distributor from the list.",

  "How to change distributor?":
    "Go to Pending Requests → Cancel → Select another distributor.",

  "How do I know my crop is sold?":
    "You receive real-time notifications when the distributor purchases.",

  "What is my Farmer ID?":
    "A unique ID generated during registration.",

  "What is Crop ID?":
    "A blockchain-linked ID generated for every crop you upload.",

  "How is QR code generated?":
    "System automatically creates a blockchain QR after crop verification.",

  "When will I receive payment?":
    "Within 24 hours after distributor purchase.",

  "Where can I see my transaction history?":
    "In the Payments/Transactions tab of your dashboard.",

  "My image is not uploading.": 
    "Make sure file size <10MB and internet is stable.",

  "My video is not uploading.": 
    "Only MP4 under 20MB is supported.",

  "I cannot submit the crop form.": 
    "Check if all required fields are filled.",

  "Internet issue while uploading.": 
    "Try again after connection stabilizes.",


  // ---------------- DISTRIBUTOR ANSWERS ----------------
  "How do I register as a distributor?":
    "Sign Up → Select Distributor → Upload business ID, GST, and verification documents.",

  "Why is my verification pending?":
    "Admin is checking your documents.",

  "What ID proof do I need?":
    "Aadhaar, PAN, GST certificate, business license.",

  "How do I view available crops?":
    "Dashboard → Available Crops.",

  "How to check crop quality?":
    "View images, videos, soil report, and certificates.",

  "How to checkout and purchase?":
    "Select crop → Click Purchase → Pay.",

  "How to handle rejected crop?":
    "Enter reason for rejection → Notify farmer.",

  "How do I log processing details?":
    "Purchased Crop → Processing Log → Save.",

  "How do I use cold storage information?":
    "Enter temperature, start time, and duration.",

  "How to update transportation details?":
    "Enter vehicle number, route, delivery photo.",

  "How to send product to retailers?":
    "Select retailer → Dispatch.",

  "When do I pay the farmer?":
    "Right after purchase.",

  "How do I receive payment from the retailer?":
    "Through in-app payment after retailer purchase.",

  "Where is my invoice?":
    "Orders → Invoice Download.",

  "I can’t open farmer photos/videos.":
    "Check internet or refresh.",

  "I am unable to update logistics details.":
    "Ensure mandatory fields and file sizes are correct.",

  "My purchase is not showing in dashboard.":
    "Refresh or login again.",


  // ---------------- RETAILER ANSWERS ----------------
  "How do I register as a retailer?":
    "Sign Up → Retailer → Upload shop proof → Submit for verification.",

  "Why is admin approval required?":
    "To ensure only verified shops participate.",

  "How to purchase from distributor?":
    "Browse crops → Add to cart → Checkout.",

  "How to compare price and quality?":
    "Use built-in comparison tool.",

  "How to check crop certificates?":
    "Certificates appear in crop details section.",

  "How do I update arrival details?":
    "Order → Arrival → Upload photo.",

  "How do I log cold storage duration?":
    "Enter start/end time, temperature.",

  "How to check product freshness?":
    "Freshness indicators are shown in your dashboard.",

  "How do I generate final consumer QR?":
    "After arrival update → Click Generate QR.",

  "What if QR is not showing?":
    "Refresh or regenerate.",

  "How do I pay the distributor?":
    "During checkout via payment gateway.",

  "Where is my purchase history?":
    "Orders → Purchase History.",

  "Cold storage temperature is not saving.":
    "Enter valid numeric temperature.",

  "Barcode/QR not scanning.":
    "Clean camera and ensure good lighting.",

  "Media files not uploading.":
    "Check file size limit.",


  // ---------------- CONSUMER ANSWERS ----------------
  "How do I verify product using QR?":
    "Scan QR to view full crop journey.",

  "What details can I see in the QR?":
    "Farmer info, soil report, processing, transport, freshness, timestamps.",

  "Can I trust this information?":
    "Yes, it is stored on blockchain and cannot be altered.",

  "How do I submit feedback?":
    "After scanning QR → scroll to feedback section.",

  "How is my feedback used?":
    "To improve farmer quality, distributor handling, and retailer service.",

  "How does AgriDirect ensure transparency?":
    "Every step is blockchain-verified.",

  "What is blockchain in this system?":
    "A tamper-proof record of all supply chain events.",

  "Why is the product priced this way?":
    "Based on crop quality, logistics, and freshness.",

  "QR is not scanning.":
    "Ensure proper lighting or clean camera lens.",

  "Details are not loading.":
    "Refresh or check internet.",

  "I cannot submit feedback.":
    "Fill all required fields."
};


// ----------------------------- GUIDED ANSWERS HANDLER -----------------------------
function guidedAnswer(option) {
  document.getElementById("guidedOptions").remove();

  chatMessages.innerHTML += `<p><b>🟢 ${USER_ROLE} – ${option}:</b></p>`;
  
  const response = answers[option] || "Sorry, no answer found.";

  chatMessages.innerHTML += `<p><b>🤖 AI:</b> ${response}</p>`;

  scrollToBottom();
  setTimeout(() => askMoreQuestions(), 500);
}

function askMoreQuestions() {
  const moreBtn = document.createElement("div");
  moreBtn.innerHTML = `
    <p><b>🤖 AI:</b> Do you have more questions?</p>
    <button style="padding:6px;width:48%;margin-top:5px;margin-right:4%;border:none;border-radius:6px;background:#d7e8ff;" onclick="showGuidedQuestions(USER_ROLE)">Yes</button>
    <button style="padding:6px;width:48%;margin-top:5px;border:none;border-radius:6px;background:#f5d7d7;" onclick="noMoreQuestions()">No</button>
  `;
  chatMessages.appendChild(moreBtn);
  scrollToBottom();
}

function noMoreQuestions() {
  chatMessages.innerHTML += `<p><b>🤖 AI:</b> Okay! You can ask anytime by clicking the chat button.</p>`;
  scrollToBottom();
}


/* --------------------------- AI MODE (Send) -----------------------------*/
sendBtn.onclick = async () => {
  if (MODE !== "ai") return; // Only active in AI mode
  const text = chatInput.value.trim();
  const imageFile = chatImage.files[0];

  if (!text && !imageFile) return;

  if (text) chatMessages.innerHTML += `<p><b>👤 You:</b> ${text}</p>`;
  else if (imageFile) chatMessages.innerHTML += `<p><b>👤 You sent an image:</b> ${imageFile.name}</p>`;

  chatInput.value = "";
  chatImage.value = "";

  const aiMessage = document.createElement("p");
  aiMessage.innerHTML = `<b>🤖 AI:</b> ...`;
  chatMessages.appendChild(aiMessage);
  scrollToBottom();

  try {
    const formData = new FormData();
    if (text) formData.append("text", text);
    if (imageFile) formData.append("image", imageFile);

    const resp = await fetch("http://localhost:5000/api/chat", { method: "POST", body: formData });
    const data = await resp.json();

    aiMessage.innerHTML = `<b>🤖 AI:</b> ${data.reply || "Sorry, something went wrong."}`;
    scrollToBottom();

    chatMessages.innerHTML += `<p><b>🤖 AI:</b> Do you have more questions? You can type or send another image.</p>`;
    scrollToBottom();
  } catch (err) {
    aiMessage.innerHTML = `<b>🤖 AI:</b> Sorry, something went wrong.`;
    scrollToBottom();
    console.error(err);
  }
};

/* --------------------------- AUTO SCROLL -----------------------------*/
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

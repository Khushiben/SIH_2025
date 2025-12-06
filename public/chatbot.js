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

/* --------------------------- GUIDED QUESTIONS -----------------------------*/
const options = {
  Farmer: ["How do I register as a farmer?", "What documents do I need to upload?", "Why is my registration not approved?" /* ...other questions*/],
  Distributor: ["How do I register as a distributor?", "Why is my verification pending?" /* ... */],
  Retailer: ["How do I register as a retailer?", "Why is admin approval required?" /* ... */],
  Consumer: ["How do I verify product using QR?", "What details can I see in the QR?" /* ... */]
};

function showGuidedQuestions(role) {
  const html = `<div id="guidedOptions">` + 
    options[role].map(opt => `<button onclick="guidedAnswer('${opt}')" style="padding:6px;width:100%;margin-top:5px;border:none;border-radius:6px;background:#eef1f7;">${opt}</button>`).join('') + 
    `</div>`;
  chatMessages.innerHTML += html;
  scrollToBottom();
}

function guidedAnswer(option) {
  document.getElementById("guidedOptions").remove();
  chatMessages.innerHTML += `<p><b>🟢 ${USER_ROLE} – ${option}:</b></p>`;
  chatMessages.innerHTML += `<p><b>🤖 AI:</b> This step-by-step guide will be added.</p>`;
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

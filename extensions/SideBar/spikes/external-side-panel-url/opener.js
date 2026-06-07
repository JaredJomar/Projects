const result = document.getElementById("result");
const button = document.getElementById("open-panel");

button.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "open-panel" });
  result.textContent = JSON.stringify(response, null, 2);
});

chrome.runtime.sendMessage({ type: "run-set-options" }).then((response) => {
  result.textContent = JSON.stringify(response, null, 2);
});

const form = document.getElementById("risk-form");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("form-error");
const resultBox = document.getElementById("result");
const gaugeFg = document.getElementById("gauge-fg");
const gaugePercent = document.getElementById("gauge-percent");
const resultBand = document.getElementById("result-band");
const factorsList = document.getElementById("factors-list");

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 52;
const BAND_COLORS = {
  Lower: "#18c29c",
  Moderate: "#f5a524",
  Higher: "#ef4444",
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Assessing…";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      errorBox.textContent = (data.errors || ["Something went wrong."]).join(" ");
      errorBox.hidden = false;
      resultBox.hidden = true;
      return;
    }

    renderResult(data);
  } catch (err) {
    errorBox.textContent = "Could not reach the server. Please try again.";
    errorBox.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Assess My Risk";
  }
});

function renderResult(data) {
  const percent = Math.round(data.probability * 100);
  const color = BAND_COLORS[data.risk_band] || BAND_COLORS.Lower;

  resultBox.hidden = false;
  gaugePercent.textContent = `${percent}%`;
  gaugeFg.style.stroke = color;

  const offset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * percent) / 100;
  requestAnimationFrame(() => {
    gaugeFg.style.strokeDashoffset = offset;
  });

  resultBand.textContent = `${data.risk_band} risk`;
  resultBand.dataset.band = data.risk_band;

  factorsList.innerHTML = "";
  if (data.top_factors && data.top_factors.length) {
    data.top_factors.forEach((factor) => {
      const li = document.createElement("li");
      li.textContent = factor;
      factorsList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No single dominant factor — overall profile is low-risk.";
    factorsList.appendChild(li);
  }

  resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Artikel codefix – NH → LB converter (mappingregels versie 5) in JavaScript

// --- Hulpfuncties ---

function extractFirst(text, tag) {
  const re = new RegExp(`<${tag}>([\s\S]*?)</${tag}>`);
  const m = text.match(re);
  return m ? m[1] : "";
}

function extractAll(text, tag) {
  const re = new RegExp(`<${tag}>([\s\S]*?)</${tag}>`, "g");
  const result = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    result.push(m[1]);
  }
  return result;
}

function stripTagWithContent(text, tag) {
  const re = new RegExp(`<${tag}>([\s\S]*?)</${tag}>`, "g");
  return text.replace(re, "");
}

function extractHeadSubdeckBlocks(text) {
  const re = new RegExp(`<head_subdeck2(?:\\(\\d+\\))?>([\\s\\S]*?)</head_subdeck2(?:\\(\\d+\\))?>`, "g");
  const result = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    result.push(m[1]);
  }
  return result;
}

function removeSuTags(text) {
  // Verwijder <SU ...> en </SU>
  text = text.replace(/<SU[^>]*>/g, "");
  text = text.replace(/<\/SU>/g, "");
  return text;
}

function adjustQuotes(text) {
  // Dubbele quotes
  text = text.replace(/,,/g, "„");
  text = text.replace(/’’/g, "”");
  // Enkele openende quotes: whitespace+’ -> whitespace+‘
  text = text.replace(/(^|\s)’/g, (m, p1) => p1 + "‘");
  return text;
}

function normalizeLeadout(text) {
  // Verwijder <leadout>-tags maar behoud inhoud, zorg dat die eindigt op . ? of !
  const re = /<leadout>(.*?)(\s*)<\/leadout>/gs;
  return text.replace(re, (_match, inner, trailing = "") => {
    let stripped = inner.replace(/\s+$/g, "");
    if (stripped) {
      const lastChar = stripped[stripped.length - 1];
      if (/^[0-9A-Za-zÀ-ÖØ-öø-ÿ]$/.test(lastChar)) {
        stripped = stripped + ".";
      }
    }
    return stripped + (trailing || "");
  });
}

function stripAllTags(text) {
  return text.replace(/<[^>]+>/g, "");
}

// --- Kern: NH → LB ---

function convertNhToLb(nhCode) {
  let nh = removeSuTags(nhCode);

  // [KOP]
  let kop = extractFirst(nh, "head").trim();
  if (!kop) {
    kop = extractFirst(nh, "head_kicker").trim();
  }

  // [KADER] (howto)
  const howtoContent = extractFirst(nh, "howto").trim();
  const hasHowto = howtoContent.length > 0;
  if (hasHowto) {
    kop = kop ? `KDR! ${kop}` : "KDR!";
  }

  // [PLATTE TEKST]
  let bodyContent = extractFirst(nh, "body");
  ["dateline", "byline", "ondertekening"].forEach((t) => {
    bodyContent = stripTagWithContent(bodyContent, t);
  });
  bodyContent = normalizeLeadout(bodyContent);
  const platteTekst = bodyContent.trim();

  // [INTRO]
  const intro = extractFirst(nh, "intro").trim();

  // [PLAATSNAAM]
  const datelineRaw = extractFirst(nh, "dateline").trim();
  const plaatsnaam = datelineRaw || "PLAATSNAAM";

  // [AUTEURSNAAM] + [ZUSTERTITEL]
  const hasNrc = nh.includes("© NRC");
  let zustertitel = "MEDIAHUIS";
  let auteursnaam = "";

  if (hasNrc) {
    // NRC-case: ondertekening als bron
    auteursnaam = extractFirst(nh, "ondertekening").trim();
    auteursnaam = auteursnaam.replace("© NRC", "").trim();
    if (auteursnaam) {
      auteursnaam = `NRC, ${auteursnaam}`;
    } else {
      auteursnaam = "NRC";
    }
    zustertitel = "";
  } else {
    // IX/XH of byline
    const m = nh.match(/<IX><XH>([\s\S]*?)<QL>/);
    if (m) {
      auteursnaam = m[1].trim();
    } else {
      let bylineBlock = extractFirst(nh, "byline").trim();
      if (bylineBlock) {
        // nested dateline weghalen
        bylineBlock = bylineBlock.replace(/<dateline>([\s\S]*?)<\/dateline>/g, "");
        let temp = bylineBlock;
        temp = temp.replace(/<\/?bold>/g, "");
        temp = temp.replace(/Tekst/gi, "");
        temp = temp.split(/Foto['’]s/)[0];
        temp = stripAllTags(temp);
        auteursnaam = temp.trim();
      }
    }
    if (!auteursnaam) {
      auteursnaam = "ONZE VERSLAGGEVER";
    }
  }

  // EP-regel
  if (auteursnaam.length > 25) {
    const chars = auteursnaam.split("");
    for (let i = 20; i < chars.length; i++) {
      if (chars[i] === " ") {
        chars[i] = "<EP>";
        auteursnaam = chars.join("");
        break;
      }
    }
  }

  // [CHAPEAU]
  const chapeau = "TREFWOORD";

  // [CITAAT] + [PERSOON]
  const quotes = [];

  const hsBlocks = extractHeadSubdeckBlocks(nh);
  hsBlocks.forEach((block) => {
    let persoon = extractFirst(block, "quote_name").trim();
    if (!persoon) {
      const onder = extractFirst(block, "ondertekening").trim();
      if (onder) {
        persoon = stripAllTags(onder).trim();
      }
    }
    let citaat = block;
    citaat = citaat.replace(/<quote_name>([\s\S]*?)<\/quote_name>/g, "");
    citaat = citaat.replace(/<ondertekening>([\s\S]*?)<\/ondertekening>/g, "");
    citaat = citaat.trim();
    if (citaat) {
      quotes.push([citaat, persoon]);
    }
  });

  const quoteBlocks = extractAll(nh, "quote");
  quoteBlocks.forEach((qBlock) => {
    if (!qBlock.trim()) return;
    let persoon = extractFirst(qBlock, "quote_name").trim();
    let citaat = qBlock.replace(/<quote_name>([\s\S]*?)<\/quote_name>/g, "").trim();
    if (citaat) {
      quotes.push([citaat, persoon]);
    }
  });

  let normQuotes;
  if (quotes.length === 0) {
    normQuotes = [["VUL HIER EEN CITAAT IN", "VUL HIER PERSOON IN"]];
  } else {
    normQuotes = quotes.map(([c, p]) => {
      const citaat = (c || "").trim();
      let persoon = (p || "").trim();
      if (!persoon) persoon = "VUL HIER PERSOON IN";
      return [citaat, persoon];
    });
  }
  normQuotes = normQuotes.slice(0, 2);

  // LB-code opbouwen
  const parts = [];

  parts.push("<head>");
  parts.push(kop);
  parts.push("</head>");

  parts.push("<body>");
  parts.push(platteTekst);
  if (!hasNrc) {
    parts.push("<bron>");
    parts.push(zustertitel);
    parts.push("</bron>");
  }
  parts.push("</body>");

  if (hasHowto) {
    parts.push("<howto>");
    parts.push(howtoContent);
    parts.push("</howto>");
  }

  parts.push("<head_overline>");
  parts.push(chapeau);
  parts.push("</head_overline>");

  parts.push("<byline>");
  parts.push("<dateline>");
  parts.push(plaatsnaam);
  parts.push("</dateline>");
  parts.push(auteursnaam);
  parts.push("</byline>");

  parts.push("<intro>");
  parts.push(intro);
  parts.push("</intro>");

  normQuotes.forEach(([citaat, persoon]) => {
    parts.push("<quote>");
    parts.push(citaat);
    parts.push("<quote_name>");
    parts.push(persoon);
    parts.push("</quote_name>");
    parts.push("</quote>");
  });

  let lbCode = parts.join("\n");
  lbCode = adjustQuotes(lbCode);
  return lbCode;
}

// --- UI wiring ---

function setupUi() {
  const inputEl = document.getElementById("inputCode");
  const outputEl = document.getElementById("outputCode");
  const convertBtn = document.getElementById("convertButton");
  const copyBtn = document.getElementById("copyButton");
  const outputSection = document.getElementById("outputSection");
  const copyStatus = document.getElementById("copyStatus");

  convertBtn.addEventListener("click", () => {
    const src = inputEl.value || "";
    if (!src.trim()) {
      outputSection.style.display = "none";
      outputEl.value = "";
      copyStatus.textContent = "";
      return;
    }
    const converted = convertNhToLb(src);
    outputEl.value = converted;
    outputSection.style.display = "block";
    copyStatus.textContent = "";
  });

  copyBtn.addEventListener("click", async () => {
    const text = outputEl.value || "";
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        outputEl.select();
        document.execCommand("copy");
      }
      copyStatus.textContent = "Gekopieerd naar klembord.";
    } catch (err) {
      console.error(err);
      copyStatus.textContent = "Kopiëren is niet gelukt.";
    }
  });
}

document.addEventListener("DOMContentLoaded", setupUi);

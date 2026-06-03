// Native fetch is available in Node 18+

async function test() {
  const url = "https://script.google.com/macros/s/AKfycbw9vd37GljaviHcVdhkRFhjnqEEHmfEr4u0_IhardRG9DDS2uAeUzi7-e-sVKbuP8dryw/exec";
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        name: "Test",
        wish: "Test",
        image: "data:image/jpeg;base64,1234"
      })
    });
    
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response text:", text);
  } catch (err) {
    console.error(err);
  }
}

test();

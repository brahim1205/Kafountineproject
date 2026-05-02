const fs = require('fs');

async function testPdf() {
  try {
    const res = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@kafountine.gouv.sn', password: 'password123' })
    });
    
    if (!res.ok) throw new Error('Login failed: ' + res.status);
    const authData = await res.json();
    const token = authData.data.accessToken;

    console.log("Logged in successfully. Getting PDF...");

    const pdfRes = await fetch('http://localhost:3000/api/v1/exports/report.pdf', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        year: 2026,
        total: 150000,
        tauxRecouvrement: 75,
        totalTransactions: 10,
        totalContribuables: 5,
        modules: [{ name: "Taxes", amount: 100000, evolution: 10 }],
        topContribuables: [{ name: "Ousmane Sonko", amount: 50000 }]
      })
    });
    
    if (!pdfRes.ok) {
        const errorText = await pdfRes.text();
        throw new Error('PDF Export failed: ' + pdfRes.status + ' ' + errorText);
    }
    
    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync('test_report_success.pdf', buffer);
    console.log("PDF generated successfully and saved to test_report_success.pdf (Size: " + buffer.length + " bytes)");

  } catch (err) {
    console.error("Error:", err);
  }
}

testPdf();

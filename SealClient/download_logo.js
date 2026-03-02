const https = require('https');
const fs = require('fs');
const file = fs.createWriteStream("C:/Users/PEA/Desktop/PEAsecSeal/SealClient/src/assets/pea_logo.png");
https.get("https://upload.wikimedia.org/wikipedia/th/thumb/a/a5/Provincial_Electricity_Authority_Logo.svg/512px-Provincial_Electricity_Authority_Logo.svg.png", { headers: { "User-Agent": "Mozilla/5.0" } }, function (response) {
    response.pipe(file);
});

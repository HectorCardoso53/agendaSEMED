import fetch from "node-fetch";
import fs from "fs";
import jwt from "jsonwebtoken";

const serviceAccount = JSON.parse(fs.readFileSync("./service-account.json"));

const gerarAccessToken = () => {
  const token = jwt.sign(
    {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
    },
    serviceAccount.private_key,
    { algorithm: "RS256", expiresIn: "1h" }
  );

  return fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
  }).then(res => res.json()).then(data => data.access_token);
};

export async function sendNotificationFCM(token, title, body) {
  const accessToken = await gerarAccessToken();

  const message = {
    message: {
      token,
      notification: { title, body },
      webpush: { fcm_options: { link: "https://seusite.com" } }
    }
  };

  const response = await fetch(
    "https://fcm.googleapis.com/v1/projects/agenda-78087/messages:send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    }
  );

  const result = await response.json();
  console.log("FCM Resultado:", result);
}

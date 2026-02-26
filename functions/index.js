const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 5,
});

initializeApp();
const db = getFirestore();

const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

exports.verificarCompromissos = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "America/Belem",
    secrets: [EMAIL_USER,EMAIL_PASS],
  },
  async () => {
    try {
      const agora = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/Sao_Paulo",
        })
      );

      console.log("🕒 Agora Brasil:", agora);

      // ⚠ transporter DENTRO da função
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL_USER.value(),
          pass: EMAIL_PASS.value(),
        },
      });

      const snapshot = await db.collectionGroup("compromissos").get();

      for (const documento of snapshot.docs) {
        const data = documento.data();

        if (!data.data || !data.horarioSaida) continue;
        if (data.notificado) continue;

        const [dia, mes, ano] = data.data.split("/");
        const [hora, minuto] = data.horarioSaida.split(":");

        const dataEvento = new Date(
          `${ano}-${mes}-${dia}T${hora}:${minuto}:00`
        );

        const diffMinutos = Math.floor(
          (dataEvento - agora) / 1000 / 60
        );

        if (diffMinutos === 30) {
          await transporter.sendMail({
            from: EMAIL_USER.value(),
            to: [
              "hectorcardoso879@gmail.com",
              "vyvykafarias@gmail.com",
              "jcgodinho7@gmail.com",
            ],
            subject: "🔔 Lembrete de Compromisso",
            text: `Você tem um compromisso: ${data.nome} às ${data.horarioSaida}`,
          });

          await documento.ref.update({ notificado: true });

          console.log("✅ Email enviado!");
        }
      }

      console.log("✔️ Verificação concluída");
    } catch (error) {
      console.error("❌ Erro geral:", error);
    }
  }
);
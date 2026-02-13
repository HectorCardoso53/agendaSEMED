const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 5,
});

initializeApp();
const db = getFirestore();

exports.verificarCompromissos = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "America/Belem",
  },
  async () => {
    try {
      // 🔥 AGORA NO FUSO DO BRASIL
      const agora = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
      );

      console.log("🕒 Agora Brasil:", agora);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "conectaorixi@gmail.com",
          pass: "wwnxyqdzdehkeedo",
        },
      });

      const snapshot = await db.collectionGroup("compromissos").get();
      console.log("📦 Total encontrados:", snapshot.size);

      for (const documento of snapshot.docs) {
        const data = documento.data();

        if (!data.data || !data.horarioSaida) continue;
        if (data.notificado) continue;

        const [dia, mes, ano] = data.data.split("/");
        const [hora, minuto] = data.horarioSaida.split(":");

        // 🔥 FORÇA FUSO -03:00
        const dataEvento = new Date(
          `${ano}-${mes}-${dia}T${hora}:${minuto}:00`,
        );

        const diffMinutos = (dataEvento - agora) / 1000 / 60;

        console.log("📌 Evento:", data.nome);
        console.log("📅 Data evento:", dataEvento);
        console.log("⏳ Diferença minutos:", diffMinutos);

        const emails = [
          "hectorcardoso879@gmail.com",
          "araujohector1997@gmail.com"
        ];

        if (diffMinutos <= 30 && diffMinutos > 0) {
          await transporter.sendMail({
            from: "conectaorixi@gmail.com",
            to: emails,
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
  },
);

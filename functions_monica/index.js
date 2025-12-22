const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { CloudTasksClient } = require("@google-cloud/tasks");

admin.initializeApp();
const db = admin.firestore();

// ========================
// CONFIGURAÇÕES
// ========================
const LOCATION = "southamerica-east1";
const QUEUE = "notificacoes-compromissos";

// Obtém o ID do projeto (produção + emulador)
const PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  (process.env.FIREBASE_CONFIG
    ? JSON.parse(process.env.FIREBASE_CONFIG).projectId
    : null);

if (!PROJECT) {
  console.error("❌ ERRO: PROJECT ID não encontrado!");
}

// =============================================
// 1) DISPARO DE TAREFA AO CRIAR UM COMPROMISSO
// =============================================
exports.onCompromissoCriado = onDocumentCreated(
  "agenda/{mesAno}/compromissos/{compId}",
  async (event) => {
    try {
      const snap = event.data;
      const params = event.params;

      if (!snap) return;

      const data = snap.data();

      // Verifica se tem data e horário
      if (!data.data || !data.horarioSaida) {
        console.log("Campo data ou horarioSaida ausente. Ignorando.");
        return;
      }

      // Converter data/hora
      const [d, m, y] = data.data.split("/");
      const [hh, mm] = data.horarioSaida.split(":");

      const dt = new Date(y, m - 1, d, hh, mm);
      const when = new Date(dt.getTime() - 30 * 60000); // 30 min antes

      console.log("⏳ Notificação agendada para:", when.toString());

      // Cloud Tasks
      const client = new CloudTasksClient();
      const parent = client.queuePath(PROJECT, LOCATION, QUEUE);

      const task = {
        httpRequest: {
          httpMethod: "POST",
          url: `https://${LOCATION}-${PROJECT}.cloudfunctions.net/enviarNotificacaoCompromisso`,
          headers: { "Content-Type": "application/json" },
          body: Buffer.from(
            JSON.stringify({
              compromissoId: params.compId,
              mesAno: params.mesAno,
            })
          ).toString("base64"),
        },
        scheduleTime: { seconds: Math.floor(when.getTime() / 1000) },
      };

      await client.createTask({ parent, task });
      console.log("✅ Task criada com sucesso!");
    } catch (err) {
      console.error("❌ Erro ao criar Task:", err);
    }
  }
);

// =============================================
// 2) ENVIO DE NOTIFICAÇÃO PARA OS USUÁRIOS
// =============================================
exports.enviarNotificacaoCompromisso = onRequest(async (req, res) => {
  try {
    console.log("📩 Body recebido:", req.body);

    const { compromissoId, mesAno } = req.body;

    if (!compromissoId || !mesAno) {
      return res.status(400).send("Body inválido.");
    }

    // Buscar compromisso
    const docComp = await db
      .collection("agenda")
      .doc(mesAno)
      .collection("compromissos")
      .doc(compromissoId)
      .get();

    if (!docComp.exists) {
      return res.status(404).send("Compromisso não encontrado");
    }

    const dados = docComp.data();
    console.log("📌 Dados do compromisso:", dados);

    // Buscar usuários
    const usuarios = await db.collection("usuarios").get();

    for (const u of usuarios.docs) {
      const userRef = u.ref;
      const tokens = u.data().tokens || [];

      if (tokens.length === 0) continue;

      for (const token of tokens) {
        try {
          await admin.messaging().send({
            token,
            notification: {
              title: `⏰ Falta 30 min para ${dados.nome}`,
              body: `Destino: ${dados.destino || "não informado"}`,
            },
            webpush: {
              fcmOptions: { link: "/" },
            },
          });

          console.log("📨 Notificação enviada para:", token);

        } catch (err) {
          // Trata token inválido
          if (err.errorInfo?.code === "messaging/registration-token-not-registered") {
            console.warn("⚠ Token inválido, removendo:", token);

            await userRef.update({
              tokens: tokens.filter((t) => t !== token),
            });

            continue;
          }

          console.error("❌ Erro ao enviar para o token:", token, err);
        }
      }
    }

    return res.send("OK");
  } catch (err) {
    console.error("❌ Erro ao enviar notificação:", err);
    return res.status(500).send("Erro interno");
  }
});

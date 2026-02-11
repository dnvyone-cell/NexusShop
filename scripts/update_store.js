const admin = require('firebase-admin');

// Pega a chave secreta do ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const DB_APP_ID = 'nexus-hub-permanent-vault'; 

const releaseData = JSON.parse(process.env.RELEASE_DATA);

async function uploadToStore() {
  try {
    console.log(`Processando: ${releaseData.name}`);

    // Procura APK ou ZIP nos assets
    const asset = releaseData.assets.find(a => a.name.endsWith('.apk') || a.name.endsWith('.zip'));
    
    if (!asset) {
      console.log('Nenhum APK encontrado. Abortando.');
      return;
    }

    // Função para ler "Chave: Valor" da descrição
    const body = releaseData.body || "";
    const extract = (key) => {
      const regex = new RegExp(`${key}:\\s*(.+)`, 'i');
      const match = body.match(regex);
      return match ? match[1].trim() : null;
    };

    const newApp = {
      name: releaseData.name || releaseData.tag_name,
      version: releaseData.tag_name,
      description: body,
      downloadUrl: asset.browser_download_url,
      category: extract('Category') || extract('Categoria') || 'Updates',
      icon: extract('Icon') || extract('Icone') || 'https://cdn-icons-png.flaticon.com/512/25/25231.png',
      developer: extract('Developer') || releaseData.author.login,
      platform: 'Mobile',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      isMod: false,
      isLocked: false
    };

    // Salva no Firebase
    const collectionRef = db.collection('artifacts').doc(DB_APP_ID).collection('public').doc('data').collection('apps');
    
    // Verifica duplicidade pelo nome
    const snapshot = await collectionRef.where('name', '==', newApp.name).get();
    
    if (!snapshot.empty) {
      await collectionRef.doc(snapshot.docs[0].id).update(newApp);
      console.log('App atualizado!');
    } else {
      await collectionRef.add(newApp);
      console.log('App novo criado!');
    }

  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

uploadToStore();

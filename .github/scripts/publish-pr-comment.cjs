#!/usr/bin/env node

/**
 * Script pour publier le commentaire de rapport dans la Pull Request
 * Usage: node publish-pr-comment.cjs
 */

const fs = require('fs');

// Import fetch pour Node.js (disponible nativement depuis Node.js 18+)
const fetch = globalThis.fetch || require('node-fetch');

// Lire le rapport
const report = fs.readFileSync('pr_report.md', 'utf8');

// Configuration GitHub API
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_EVENT_NUMBER = process.env.GITHUB_EVENT_NUMBER;

const errors = [];
if (!GITHUB_TOKEN) {
  console.error('❌ Variable d\'environnement GITHUB_TOKEN manquante');
  errors.push('GITHUB_TOKEN');
}
if (!GITHUB_REPOSITORY) {
  console.error('❌ Variable d\'environnement GITHUB_REPOSITORY manquante');
  errors.push('GITHUB_REPOSITORY');
}
if (!GITHUB_EVENT_NUMBER) {
  console.error('❌ Variable d\'environnement GITHUB_EVENT_NUMBER manquante');
  errors.push('GITHUB_EVENT_NUMBER');
}

if (errors.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', errors.join(', '));
  process.exit(1);
}

// Fonction pour faire des appels API GitHub sécurisés
async function githubApiRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DVG-Web-Backend-CI'
    }
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API GitHub error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Erreur API GitHub: ${error.message}`);
    throw error;
  }
}

// Fonction pour lister les commentaires
async function listComments() {
  return await githubApiRequest(`issues/${GITHUB_EVENT_NUMBER}/comments`);
}

// Fonction pour créer un commentaire
async function createComment(body) {
  return await githubApiRequest(`issues/${GITHUB_EVENT_NUMBER}/comments`, 'POST', {
    body: body
  });
}

// Fonction pour mettre à jour un commentaire
async function updateComment(commentId, body) {
  return await githubApiRequest(`issues/comments/${commentId}`, 'PATCH', {
    body: body
  });
}

// Fonction principale
async function main() {
  try {
    console.log('🔍 Recherche des commentaires existants...');
    
    // Lister les commentaires
    const comments = await listComments();
    
    // Rechercher un commentaire existant du bot
    const botComment = comments.find(comment => 
      comment.user.type === 'Bot' && 
      comment.body.includes('Rapport de Build - Backend NestJS')
    );
    
    if (botComment) {
      console.log('📝 Mise à jour du commentaire existant...');
      await updateComment(botComment.id, report);
      console.log('✅ Commentaire mis à jour avec succès');
    } else {
      console.log('➕ Création d\'un nouveau commentaire...');
      await createComment(report);
      console.log('✅ Commentaire créé avec succès');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la publication du commentaire:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error('❌ Erreur fatale:', error.message);
  process.exit(1);
});


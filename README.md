# Hilmy

Hilmy est une application Next.js avec authentification Supabase et emails transactionnels gérés côté serveur.

## Démarrage

```bash
npm install
npm run dev
```

L'application démarre sur `http://localhost:3000`.

## Variables d'environnement

Les flux d'inscription et de réinitialisation utilisent désormais des routes serveur.

### Obligatoires

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_FROM="Hilmy <hello@hilmy.io>"
FOUNDER_NOTIFICATION_EMAILS="founder1@hilmy.io,founder2@hilmy.io"
```

### Envoi email recommandé : Resend

```bash
RESEND_API_KEY=
```

Avec `RESEND_API_KEY`, l'application envoie les emails via l'API Resend. C'est le chemin recommandé pour la prod.

### Fallback SMTP

Si `RESEND_API_KEY` est absent, l'application bascule sur SMTP.

```bash
BREVO_SMTP_USER=
BREVO_SMTP_KEY=
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
```

## Flux auth email

- L'inscription appelle `POST /api/auth/signup`
- Le renvoi de confirmation appelle `POST /api/auth/resend-confirmation`
- La réinitialisation appelle `POST /api/auth/password-reset`
- Les liens sont générés via `supabase.auth.admin.generateLink(...)`
- Les emails sont envoyés depuis `lib/email/transactional.ts`
- Les founders reçoivent un email de notification à chaque nouveau compte via `FOUNDER_NOTIFICATION_EMAILS`

Le renvoi de confirmation utilise `supabase.auth.resend(...)` côté serveur, car l'API admin Supabase ne fournit pas de `generateLink()` dédié au renvoi d'un signup déjà créé.

## Checklist prod

1. Ajouter `SUPABASE_SERVICE_ROLE_KEY` dans l'environnement local et production.
2. Configurer un domaine d'envoi vérifié pour `EMAIL_FROM`.
3. Si tu utilises Resend, vérifier le domaine dans Resend.
4. Si tu utilises SMTP, vérifier les identifiants et les DNS SPF/DKIM.
5. Vérifier que l'URL publique du site pointe bien vers `/auth/callback` après confirmation et recovery.

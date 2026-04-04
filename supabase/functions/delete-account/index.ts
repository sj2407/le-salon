import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Delete Account edge function.
 * Deletes all user data and the auth user itself.
 * Called from AccountSettings with the user's JWT.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Extract user from JWT
  const authHeader = req.headers.get('authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing auth token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Verify the JWT and get the user
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const userId = user.id;

  // Guard demo account against deletion (App Store reviewer account)
  if (userId === 'a0000000-0000-0000-0000-000000000001') {
    return new Response(JSON.stringify({ error: 'Demo account cannot be deleted' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    // Delete user data from all tables in FK-safe order.
    // Tables with ON DELETE CASCADE from profiles(id) will auto-delete,
    // but we explicitly delete everything for safety.

    // Child tables first (reference other user tables)
    const childDeletes = [
      supabaseAdmin.from('entries').delete().in('card_id',
        supabaseAdmin.from('cards').select('id').eq('user_id', userId).then(r => (r.data || []).map(c => c.id))
      ),
      supabaseAdmin.from('activity_interests').delete().eq('user_id', userId),
      supabaseAdmin.from('review_comments').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      supabaseAdmin.from('review_recommendations').delete().in('review_id',
        supabaseAdmin.from('reviews').select('id').eq('user_id', userId).then(r => (r.data || []).map(rev => rev.id))
      ),
      supabaseAdmin.from('card_notes').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      supabaseAdmin.from('newsletter_items').delete().in('newsletter_id',
        supabaseAdmin.from('newsletters').select('id').eq('user_id', userId).then(r => (r.data || []).map(n => n.id))
      ),
    ];

    // Wait for the nested queries to resolve and execute deletes
    // entries need card IDs first
    const { data: userCards } = await supabaseAdmin.from('cards').select('id').eq('user_id', userId);
    const cardIds = (userCards || []).map(c => c.id);
    if (cardIds.length > 0) {
      await supabaseAdmin.from('entries').delete().in('card_id', cardIds);
    }

    const { data: userReviews } = await supabaseAdmin.from('reviews').select('id').eq('user_id', userId);
    const reviewIds = (userReviews || []).map(r => r.id);
    if (reviewIds.length > 0) {
      await supabaseAdmin.from('review_comments').delete().in('review_id', reviewIds);
      await supabaseAdmin.from('review_recommendations').delete().in('review_id', reviewIds);
    }

    const { data: userNewsletters } = await supabaseAdmin.from('newsletters').select('id').eq('user_id', userId);
    const newsletterIds = (userNewsletters || []).map(n => n.id);
    if (newsletterIds.length > 0) {
      await supabaseAdmin.from('newsletter_items').delete().in('newsletter_id', newsletterIds);
    }

    // Delete comments/notes referencing this user from other users too
    await supabaseAdmin.from('card_notes').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    await supabaseAdmin.from('review_comments').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    await supabaseAdmin.from('activity_interests').delete().eq('user_id', userId);

    // Also clear claimed_by references on other users' wishlists
    await supabaseAdmin.from('wishlist_items').update({ claimed_by: null }).eq('claimed_by', userId);

    // Main user tables
    const mainDeletes = [
      'books', 'reviews', 'cards', 'activities', 'experiences', 'creations',
      'wishlist_items', 'notifications', 'device_tokens', 'share_tokens',
      'pending_shares', 'spotify_tokens', 'spotify_profiles',
      'parlor_responses', 'commonplace_entries', 'commonplace_last_seen',
      'newsletters', 'feedback', 'friendships',
    ];

    for (const table of mainDeletes) {
      if (table === 'friendships') {
        await supabaseAdmin.from(table).delete().or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
      } else {
        await supabaseAdmin.from(table).delete().eq('user_id', userId);
      }
    }

    // Delete storage files
    try {
      const { data: profilePhotos } = await supabaseAdmin.storage.from('profile-photo').list(userId);
      if (profilePhotos?.length) {
        await supabaseAdmin.storage.from('profile-photo').remove(profilePhotos.map(f => `${userId}/${f.name}`));
      }
      const { data: creationImages } = await supabaseAdmin.storage.from('creation-images').list(userId);
      if (creationImages?.length) {
        await supabaseAdmin.storage.from('creation-images').remove(creationImages.map(f => `${userId}/${f.name}`));
      }
    } catch {
      // Storage cleanup is best-effort — don't block account deletion
    }

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('Account deletion failed:', err);
    return new Response(JSON.stringify({ error: 'Account deletion failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});

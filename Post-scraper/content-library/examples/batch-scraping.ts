/**
 * Batch scraping example - demonstrates efficient batch operations
 */

import { InflactService } from '../src/index';
import * as fs from 'fs';

async function main() {
  let service: InflactService | null = null;

  try {
    console.log('🚀 Starting Batch Instagram Scraper...\n');

    // Initialize service
    service = new InflactService();

    // Initialize browser once
    console.log('📱 Initializing browser session...');
    await service.initializeBrowser({
      headless: true, // Headless for batch operations
      slowmo: 50,
    });
    console.log('✅ Browser ready\n');

    // Usernames to scrape
    const usernames = ['instagram', 'cristiano', 'selenagomez'];

    const batchResults: any[] = [];

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      console.log(`\n[${ i + 1}/${usernames.length}] Scraping @${username}...`);

      try {
        // Fetch complete profile data
        const completeData = await service.fetchProfileComplete(username);

        const result = {
          username,
          scraped_at: new Date().toISOString(),
          profile: completeData.profile
            ? {
                id: completeData.profile.id,
                username: completeData.profile.username,
                full_name: completeData.profile.fullName,
                biography: completeData.profile.biography,
                follower_count: completeData.profile.followerCount,
                following_count: completeData.profile.followingCount,
                post_count: completeData.profile.postCount,
                is_verified: completeData.profile.isVerified,
              }
            : null,
          stats: {
            posts_fetched: completeData.posts.length,
            reels_fetched: completeData.reels.length,
            stories_fetched: completeData.stories.length,
          },
          top_posts: completeData.posts.slice(0, 3).map((p) => ({
            id: p.id,
            caption: p.caption?.substring(0, 100),
            likes: p.likeCount,
            comments: p.commentCount,
          })),
        };

        batchResults.push(result);

        console.log(`   ✅ Scraped: ${completeData.posts.length} posts, ${completeData.reels.length} reels`);

        // Optional: Download media for first user only
        if (i === 0 && completeData.posts.length > 0) {
          console.log(`   📥 Downloading media for @${username}...`);
          const postsToDownload = completeData.posts.slice(0, 3);
          await service.downloadPosts(postsToDownload, username);
          console.log(`   ✅ Downloaded ${postsToDownload.length} posts`);
        }
      } catch (error) {
        console.error(`   ❌ Error scraping @${username}:`, error);
        batchResults.push({
          username,
          error: (error as Error).message,
          scraped_at: new Date().toISOString(),
        });
      }

      // Be respectful - add delay between requests
      if (i < usernames.length - 1) {
        console.log('   ⏳ Waiting 2 seconds before next request...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Save batch results
    const outputFile = `batch_results_${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(batchResults, null, 2), 'utf-8');
    console.log(`\n✅ Batch results saved to: ${outputFile}`);

    // Print summary
    console.log('\n📊 Batch Summary:');
    console.log(`   Total profiles: ${batchResults.length}`);
    console.log(`   Successful: ${batchResults.filter((r) => r.profile).length}`);
    console.log(`   Failed: ${batchResults.filter((r) => r.error).length}`);

    const totalPosts = batchResults.reduce((sum, r) => sum + (r.stats?.posts_fetched || 0), 0);
    console.log(`   Total posts fetched: ${totalPosts}`);
  } catch (error) {
    console.error('❌ Batch operation failed:', error);
  } finally {
    if (service) {
      console.log('\n🛑 Cleaning up...');
      await service.close();
      console.log('✅ Closed');
    }
  }
}

main().catch(console.error);

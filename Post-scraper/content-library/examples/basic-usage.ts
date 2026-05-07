/**
 * Basic usage example - demonstrates core functionality
 */

import { InflactService } from '../src/index';
import * as fs from 'fs';

async function main() {
  let service: InflactService | null = null;

  try {
    console.log('🚀 Starting Inflact Browser Session Extractor...\n');

    // Initialize service
    service = new InflactService();

    // STEP 1: Initialize browser session (generates tokens dynamically)
    console.log('📱 Step 1: Initializing browser session...');
    await service.initializeBrowser({
      headless: false, // Set to true for production
      slowmo: 100,
      timeout: 30000,
    });
    console.log('✅ Browser session initialized!\n');

    // STEP 2: Save session for future use
    console.log('💾 Step 2: Saving session...');
    await service.saveSession('default_session');
    console.log('✅ Session saved!\n');

    // STEP 3: Fetch profile
    const username = 'instagram'; // Change to desired username
    console.log(`📊 Step 3: Fetching profile for @${username}...`);
    const profileRes = await service.fetchProfile(username);

    if (profileRes.success && profileRes.data) {
      console.log(`✅ Profile fetched!`);
      console.log(`   Username: ${profileRes.data.username}`);
      console.log(`   Followers: ${profileRes.data.followerCount.toLocaleString()}`);
      console.log(`   Posts: ${profileRes.data.postCount}`);
      console.log(`   Bio: ${profileRes.data.biography}\n`);
    } else {
      console.log(`❌ Failed to fetch profile: ${profileRes.error}\n`);
    }

    // STEP 4: Fetch posts with pagination
    console.log(`🖼️  Step 4: Fetching posts for @${username}...`);
    const postsRes = await service.fetchPosts(username);

    if (postsRes.success && postsRes.data) {
      console.log(`✅ Fetched ${postsRes.data.length} posts`);

      // Display first post
      if (postsRes.data.length > 0) {
        const firstPost = postsRes.data[0];
        console.log(`   First post ID: ${firstPost.id}`);
        console.log(`   Caption: ${firstPost.caption?.substring(0, 50)}...`);
        console.log(`   Likes: ${firstPost.likeCount}`);
        console.log(`   Comments: ${firstPost.commentCount}\n`);
      }
    } else {
      console.log(`❌ Failed to fetch posts: ${postsRes.error}\n`);
    }

    // STEP 5: Fetch reels
    console.log(`🎬 Step 5: Fetching reels for @${username}...`);
    const reelsRes = await service.fetchReels(username);

    if (reelsRes.success && reelsRes.data) {
      console.log(`✅ Fetched ${reelsRes.data.length} reels\n`);
    } else {
      console.log(`❌ Failed to fetch reels: ${reelsRes.error}\n`);
    }

    // STEP 6: Fetch stories
    console.log(`📖 Step 6: Fetching stories for @${username}...`);
    const storiesRes = await service.fetchStories(username);

    if (storiesRes.success && storiesRes.data) {
      console.log(`✅ Fetched ${storiesRes.data.length} stories\n`);
    } else {
      console.log(`❌ Failed to fetch stories: ${storiesRes.error}\n`);
    }

    // STEP 7: Save results to file
    const results = {
      timestamp: new Date().toISOString(),
      username,
      profile: profileRes.data,
      postCount: postsRes.data?.length || 0,
      reelCount: reelsRes.data?.length || 0,
      storyCount: storiesRes.data?.length || 0,
    };

    const outputFile = `results_${username}_${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`✅ Results saved to: ${outputFile}\n`);

    console.log('🎉 All operations completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (service) {
      console.log('\n🛑 Cleaning up...');
      await service.close();
      console.log('✅ Closed');
    }
  }
}

main().catch(console.error);

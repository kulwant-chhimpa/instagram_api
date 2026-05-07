/**
 * Session restoration example - demonstrates loading existing sessions
 */

import { InflactService } from '../src/index';

async function main() {
  let service: InflactService | null = null;

  try {
    console.log('🚀 Starting with Existing Session...\n');

    // Initialize service
    service = new InflactService();

    // Check if session exists
    const sessions = service.getSessionStorage().listSessions();
    console.log(`📋 Available sessions: ${sessions.join(', ')}\n`);

    if (sessions.length === 0) {
      console.log('❌ No existing sessions found. Run basic-usage.ts first to create one.\n');
      return;
    }

    // Load first session
    const sessionId = sessions[0];
    console.log(`📂 Loading session: ${sessionId}...`);
    const loaded = await service.loadSession(sessionId);

    if (!loaded) {
      console.log('❌ Failed to load session\n');
      return;
    }

    console.log('✅ Session loaded!\n');

    // Now use the service with the loaded session
    const username = 'instagram';
    console.log(`📊 Fetching profile for @${username} with loaded session...`);

    const profileRes = await service.fetchProfile(username);

    if (profileRes.success) {
      console.log('✅ Profile fetched successfully!');
      console.log(`   Username: ${profileRes.data?.username}`);
      console.log(`   Followers: ${profileRes.data?.followerCount.toLocaleString()}\n`);
    } else {
      console.log(`❌ Failed to fetch: ${profileRes.error}\n`);
    }

    // Show interceptor statistics
    const browserSession = service.getBrowserSession();
    if (browserSession) {
      const interceptor = browserSession.getInterceptor();
      const stats = interceptor.getStatistics();
      console.log('📊 Request Interceptor Stats:');
      console.log(`   Total captured: ${stats.totalCaptured}`);
      console.log(`   With token: ${stats.withToken}`);
      console.log(`   With signature: ${stats.withSignature}`);
      console.log(`   Avg response time: ${stats.averageResponseTime}ms\n`);
    }

    console.log('🎉 Session restoration example completed!');
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

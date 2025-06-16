#!/usr/bin/env ts-node

/**
 * JIRA Test Script
 * 
 * Quick test to verify JIRA integration is working
 */

import { JiraManager } from './src/services/jira';

async function testJiraIntegration() {
  console.log('🔧 Testing JIRA Integration...\n');
  
  const jiraManager = JiraManager.getInstance();
  
  // Test configuration
  console.log('📋 Configuration Status:');
  console.log(`   Configured: ${jiraManager.isConfigured()}`);
  
  if (!jiraManager.isConfigured()) {
    console.log('⚠️  JIRA is not configured. Please set up your .env file.');
    console.log('   Required variables: JIRA_BASE_URL, JIRA_USERNAME, JIRA_API_TOKEN');
    return;
  }
  
  try {
    // Test connection
    console.log('\n🔌 Testing Connection...');
    const connectionInfo = await jiraManager.getConnectionInfo();
    
    if (connectionInfo.userInfo) {
      console.log(`✅ Connected as: ${connectionInfo.userInfo.displayName}`);
      console.log(`📧 Email: ${connectionInfo.userInfo.emailAddress}`);
    } else {
      console.log('❌ Connection failed');
      return;
    }
    
    // Test projects
    console.log('\n📁 Fetching Projects...');
    const project = await jiraManager.projects.getProject("DOC");
    
    // Test issues for the first project
    if (project) {
      console.log(`\n🎫 Fetching Recent Issues for ${project.key}...`);
      
      try {
        const issues = await jiraManager.issues.getProjectIssues(project.key, 5);
        console.log(`✅ Found ${issues.total} total issues (showing first ${Math.min(5, issues.issues.length)}):`);
        
        issues.issues.forEach(issue => {
          console.log(`   • ${issue.key}: ${issue.fields.summary}`);
          console.log(`     Status: ${issue.fields.status.name} | Type: ${issue.fields.issuetype.name}`);
          
          // Use the plain text description provided by our service
          if (issue.fields.descriptionText) {
            const truncatedDescription = issue.fields.descriptionText.length > 100 
              ? issue.fields.descriptionText.substring(0, 100) + '...'
              : issue.fields.descriptionText;
            console.log(`     Description: ${truncatedDescription}`);
          } else if (issue.renderedFields?.description) {
            // Fallback to HTML version if available
            const htmlStripped = issue.renderedFields.description
              .replace(/<[^>]*>/g, '')
              .substring(0, 100) + '...';
            console.log(`     Description: ${htmlStripped}`);
          } else {
            console.log(`     Description: No description available`);
          }
        });
      } catch (error) {
        console.log(`⚠️  Could not fetch issues for ${project.key}: ${error}`);
      }
    }
    
    // Test comments functionality
    console.log('\n💬 Testing Comments...');
    try {
      // Get comments for the first issue
      const issues = await jiraManager.issues.getProjectIssues("DOC", 1);
      if (issues.issues.length > 0) {
        const firstIssue = issues.issues[0];
        console.log(`\n📝 Fetching comments for ${firstIssue.key}...`);
        
        const comments = await jiraManager.issues.getIssueComments(firstIssue.key, 3);
        console.log(`✅ Found ${comments.total} total comments (showing first ${comments.comments.length}):`);
        
        comments.comments.forEach((comment, index) => {
          console.log(`   ${index + 1}. By ${comment.author.displayName} on ${new Date(comment.created).toLocaleDateString()}`);
          if (comment.bodyText) {
            const truncatedComment = comment.bodyText.length > 80 
              ? comment.bodyText.substring(0, 80) + '...'
              : comment.bodyText;
            console.log(`      "${truncatedComment}"`);
          }
        });
        
        if (comments.comments.length === 0) {
          console.log('   No comments found for this issue.');
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch comments: ${error}`);
    }
    
    console.log('\n✅ JIRA integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ JIRA integration test failed:', error);
  }
}

// Run the test
testJiraIntegration().catch(console.error);

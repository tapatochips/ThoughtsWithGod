import React from 'react';
import CommunityBoard, { CommunityBoardConfig } from '../components/community/CommunityBoard';

const config: CommunityBoardConfig = {
  collectionName: 'biblical-discussions',
  itemNoun: 'discussion',
  title: 'Biblical Discussions',
  subtitle: 'Share insights, discuss scripture, and grow in faith together',
  inputPlaceholder: 'Share your biblical thoughts, insights, or questions...',
  addButtonLabel: 'Share Discussion',
  loadingText: 'Loading Biblical Discussions...',
  loginPromptText: 'Please log in to join Biblical Discussions.',
  emptyTitle: 'No discussions yet',
  emptySubtitle: 'Be the first to share a biblical discussion',
  emptyIcon: 'book-outline',
};

const BiblicalDiscussions: React.FC = () => <CommunityBoard config={config} />;

export default BiblicalDiscussions;

import React from 'react';
import CommunityBoard, { CommunityBoardConfig } from '../components/community/CommunityBoard';

const config: CommunityBoardConfig = {
  collectionName: 'prayers',
  itemNoun: 'prayer request',
  title: 'Prayer Board',
  subtitle: 'Share your prayer requests and support others',
  inputPlaceholder: 'Enter your prayer request...',
  addButtonLabel: 'Add Prayer',
  loadingText: 'Loading Prayer Board...',
  loginPromptText: 'Please log in to use the Prayer Board.',
  emptyTitle: 'No prayer requests yet',
  emptySubtitle: 'Be the first to add a prayer request',
  emptyIcon: 'people-outline',
  supportsAnonymous: true,
  supportsAnswered: true,
};

const PrayerBoard: React.FC = () => <CommunityBoard config={config} />;

export default PrayerBoard;

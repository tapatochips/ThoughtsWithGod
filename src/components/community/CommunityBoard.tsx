import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { useFirebase } from '../../context/FirebaseContext';
import { useTheme } from '../../context/ThemeProvider';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
  increment
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { validatePrayer, validateComment, LIMITS } from '../../utils/inputValidation';
import { formatRelativeDate } from '../../utils/dateUtils';

// =================== TYPES ===================

export interface CommunityComment {
  id: string;
  text: string;
  userId: string;
  username: string;
  createdAt: any;
}

export interface CommunityPost {
  id: string;
  text: string;
  userId: string | null;
  username: string;
  createdAt: any;
  likedBy: string[];
  commentCount: number;
  answered?: boolean;
  isAnonymous?: boolean;
}

/**
 * Everything that differs between the Prayer Board and Biblical Discussions
 * lives in this config. The component itself is identical for both.
 */
export interface CommunityBoardConfig {
  /** Firestore collection name, e.g. 'prayers' or 'biblical-discussions' */
  collectionName: string;
  /** Singular noun for alerts, e.g. 'prayer request' or 'discussion' */
  itemNoun: string;
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  addButtonLabel: string;
  loadingText: string;
  loginPromptText: string;
  emptyTitle: string;
  emptySubtitle: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  /** Enables the "Post anonymously" toggle + private ownedPrayers ownership records */
  supportsAnonymous?: boolean;
  /** Enables the "Mark Answered" owner action and Answered badge */
  supportsAnswered?: boolean;
}

interface CommunityBoardProps {
  config: CommunityBoardConfig;
}

// =================== COMPONENT ===================

const CommunityBoard: React.FC<CommunityBoardProps> = ({ config }) => {
  const { user, db, userProfile } = useFirebase();
  const { theme } = useTheme();
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [ownedPostIds, setOwnedPostIds] = useState<Set<string>>(new Set());

  const { collectionName } = config;

  // Subscribe to posts
  useEffect(() => {
    if (!db || !user) {
      setLoading(false);
      return;
    }

    const postsCollection = collection(db, collectionName);
    const postsQuery = query(postsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const fetched: CommunityPost[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            ...data,
            id: docSnap.id,
            likedBy: data.likedBy || [],
            commentCount: data.commentCount || 0
          } as CommunityPost);
        });
        setPosts(fetched);
        setLoading(false);
      },
      (error) => {
        console.error(`Error fetching ${config.itemNoun}s:`, error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db, user, collectionName]);

  // Subscribe to the private ownership subcollection so we can show owner
  // controls on anonymous posts the current user created without exposing
  // their userId publicly. Only relevant when anonymous posting is enabled.
  useEffect(() => {
    if (!config.supportsAnonymous || !db || !user) {
      setOwnedPostIds(new Set());
      return;
    }

    const ownedCollection = collection(db, `users/${user.uid}/ownedPrayers`);
    const unsubscribe = onSnapshot(
      ownedCollection,
      (snapshot) => {
        const ids = new Set<string>();
        snapshot.forEach((d) => ids.add(d.id));
        setOwnedPostIds(ids);
      },
      (error) => {
        console.error('Error fetching owned posts:', error);
      }
    );

    return unsubscribe;
  }, [db, user, config.supportsAnonymous]);

  // Subscribe to comments for the selected post
  useEffect(() => {
    if (!db || !selectedPost) {
      setComments([]);
      return;
    }

    const commentsCollection = collection(db, `${collectionName}/${selectedPost.id}/comments`);
    const commentsQuery = query(commentsCollection, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const fetched: CommunityComment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            ...data,
            id: docSnap.id,
          } as CommunityComment);
        });
        setComments(fetched);
      },
      (error) => {
        console.error('Error fetching comments:', error);
      }
    );

    return unsubscribe;
  }, [db, selectedPost, collectionName]);

  const isOwner = (post: CommunityPost) =>
    !!user && (post.userId === user.uid || ownedPostIds.has(post.id));

  const handleAddPost = async () => {
    if (!user || !db || !newPost.trim()) return;

    const validation = validatePrayer(newPost);
    if (!validation.valid) {
      Alert.alert('Invalid Input', validation.error);
      return;
    }

    const postAnonymously = !!config.supportsAnonymous && isAnonymous;

    setSubmitting(true);

    try {
      const batch = writeBatch(db);

      // Pre-generate the post document reference so we can reference its ID
      const postRef = doc(collection(db, collectionName));
      const postData: Record<string, any> = {
        text: validation.sanitized,
        // For anonymous posts userId and username are omitted from the public
        // document to prevent de-anonymisation via direct Firestore reads.
        userId: postAnonymously ? null : user.uid,
        username: postAnonymously
          ? 'Anonymous'
          : (userProfile?.username || `User_${user.uid.substring(0, 5)}`),
        // Security rules require createdAt == request.time, so this MUST be serverTimestamp()
        createdAt: serverTimestamp(),
        likedBy: [],
        commentCount: 0
      };
      if (config.supportsAnswered) {
        postData.answered = false;
      }
      if (config.supportsAnonymous) {
        postData.isAnonymous = postAnonymously;
      }
      batch.set(postRef, postData);

      // Update rate limit atomically with the post creation.
      // Security rules REQUIRE this write in the same batch (updatesRateLimit),
      // and only allow lastActionAt == request.time.
      const rateLimitRef = doc(db, `rateLimits/${user.uid}`);
      batch.set(rateLimitRef, { lastActionAt: serverTimestamp() });

      if (postAnonymously) {
        // The private ownership record MUST be created in the same batch as
        // the post — security rules enforce this atomicity.
        const ownerDoc = doc(db, `users/${user.uid}/ownedPrayers`, postRef.id);
        batch.set(ownerDoc, { prayerId: postRef.id, createdAt: serverTimestamp() });
      }

      await batch.commit();

      setNewPost('');
      setIsAnonymous(false);
    } catch (error) {
      console.error(`Error adding ${config.itemNoun}:`, error);
      Alert.alert('Error', `Failed to add ${config.itemNoun}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAnswered = async (post: CommunityPost) => {
    if (!db || !user || !isOwner(post)) return;

    try {
      const postDoc = doc(db, collectionName, post.id);
      await updateDoc(postDoc, {
        answered: !post.answered,
      });
    } catch (error) {
      console.error(`Error updating ${config.itemNoun}:`, error);
      Alert.alert('Error', `Failed to update ${config.itemNoun}. Please try again.`);
    }
  };

  const handleDeletePost = async (post: CommunityPost) => {
    if (!user || !db) return;

    if (!isOwner(post)) {
      Alert.alert('Permission Denied', `You can only delete your own ${config.itemNoun}s.`);
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete this ${config.itemNoun}? This will also delete all comments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all comments in chunked batches (Firestore batch limit is 500 ops).
              // Rules allow the post owner to delete comments under their own post.
              const commentsCollection = collection(db, `${collectionName}/${post.id}/comments`);
              const commentsSnapshot = await getDocs(commentsCollection);
              const commentDocs = commentsSnapshot.docs;
              for (let i = 0; i < commentDocs.length; i += 400) {
                const chunk = commentDocs.slice(i, i + 400);
                const commentBatch = writeBatch(db);
                chunk.forEach((commentDoc) => commentBatch.delete(commentDoc.ref));
                await commentBatch.commit();
              }

              // Delete the post and (for anonymous posts) the private ownership
              // record together, so neither can be left behind.
              const finalBatch = writeBatch(db);
              finalBatch.delete(doc(db, collectionName, post.id));
              if (config.supportsAnonymous && post.isAnonymous) {
                finalBatch.delete(doc(db, `users/${user.uid}/ownedPrayers`, post.id));
              }
              await finalBatch.commit();
            } catch (error) {
              console.error(`Error deleting ${config.itemNoun}:`, error);
              Alert.alert('Error', `Failed to delete ${config.itemNoun}. Please try again.`);
            }
          }
        }
      ]
    );
  };

  const handleToggleLike = async (post: CommunityPost) => {
    if (!user || !db) return;

    try {
      const postDoc = doc(db, collectionName, post.id);
      const isLiked = post.likedBy.includes(user.uid);

      await updateDoc(postDoc, {
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const openComments = (post: CommunityPost) => {
    setSelectedPost(post);
    setModalVisible(true);
  };

  const handleAddComment = async () => {
    if (!user || !db || !selectedPost || !newComment.trim()) return;

    const validation = validateComment(newComment);
    if (!validation.valid) {
      Alert.alert('Invalid Input', validation.error);
      return;
    }

    setSubmitting(true);

    try {
      const commentsCollection = collection(db, `${collectionName}/${selectedPost.id}/comments`);

      await addDoc(commentsCollection, {
        text: validation.sanitized,
        userId: user.uid,
        username: userProfile?.username || `User_${user.uid.substring(0, 5)}`,
        createdAt: serverTimestamp()
      });

      // Update comment count atomically to avoid race conditions
      const postDoc = doc(db, collectionName, selectedPost.id);
      await updateDoc(postDoc, {
        commentCount: increment(1)
      });

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!user || !db || !selectedPost) return;

    if (user.uid !== commentUserId) {
      Alert.alert('Permission Denied', 'You can only delete your own comments.');
      return;
    }

    try {
      const commentDoc = doc(db, `${collectionName}/${selectedPost.id}/comments`, commentId);
      await deleteDoc(commentDoc);

      const postDoc = doc(db, collectionName, selectedPost.id);
      await updateDoc(postDoc, {
        commentCount: increment(-1)
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // =================== RENDER ===================

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text, marginTop: 16 }]}>
          {config.loadingText}
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="person-circle-outline" size={48} color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text, marginTop: 16 }]}>
          {config.loginPromptText}
        </Text>
      </View>
    );
  }

  const renderAvatarInitial = (post: CommunityPost) =>
    post.isAnonymous ? '?' : (post.username || 'U')[0].toUpperCase();

  const renderUsername = (post: CommunityPost) =>
    post.isAnonymous ? 'Anonymous' : (post.username || 'User');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, ...getShadowStyle(theme) }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {config.subtitle}
          </Text>
        </View>

        <View style={[styles.inputContainer, {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          ...getShadowStyle(theme)
        }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={newPost}
            onChangeText={setNewPost}
            placeholder={config.inputPlaceholder}
            placeholderTextColor={theme.colors.secondary}
            multiline
            maxLength={LIMITS.PRAYER_MAX_LENGTH}
          />
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
            {newPost.length}/{LIMITS.PRAYER_MAX_LENGTH}
          </Text>

          {config.supportsAnonymous && (
            <View style={styles.anonymousToggleContainer}>
              <TouchableOpacity
                style={[styles.anonymousToggle, {
                  backgroundColor: isAnonymous ? theme.colors.primary : 'transparent',
                  borderColor: theme.colors.primary
                }]}
                onPress={() => setIsAnonymous(!isAnonymous)}
              >
                {isAnonymous && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </TouchableOpacity>
              <Text style={[styles.anonymousLabel, { color: theme.colors.text }]}>
                Post anonymously
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.primary },
              submitting && { opacity: 0.7 }
            ]}
            onPress={handleAddPost}
            disabled={submitting || !newPost.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.addButtonText}>{config.addButtonLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[
              styles.postItem,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                ...getShadowStyle(theme)
              },
              config.supportsAnswered && item.answered &&
                [styles.answeredPost, { borderColor: theme.colors.success }]
            ]}>
              <View style={styles.postHeader}>
                <View style={styles.userInfo}>
                  <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.avatarText}>{renderAvatarInitial(item)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.username, { color: theme.colors.text }]}>
                      {renderUsername(item)}
                    </Text>
                    <Text style={[styles.postDate, { color: theme.colors.textSecondary }]}>
                      {formatRelativeDate(item.createdAt)}
                    </Text>
                  </View>
                </View>

                {config.supportsAnswered && item.answered && (
                  <View style={[styles.answeredBadge, { backgroundColor: theme.colors.success }]}>
                    <Text style={styles.answeredText}>Answered</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.postText, { color: theme.colors.text }]}>
                {item.text}
              </Text>

              <View style={[styles.interactionBar, { borderTopColor: theme.colors.divider }]}>
                <TouchableOpacity
                  style={styles.interactionButton}
                  onPress={() => handleToggleLike(item)}
                >
                  <Ionicons
                    name={item.likedBy.includes(user.uid) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={item.likedBy.includes(user.uid) ? theme.colors.danger : theme.colors.textSecondary}
                  />
                  <Text style={[
                    styles.interactionText,
                    { color: item.likedBy.includes(user.uid) ? theme.colors.danger : theme.colors.textSecondary }
                  ]}>
                    {item.likedBy.length}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.interactionButton}
                  onPress={() => openComments(item)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.interactionText, { color: theme.colors.textSecondary }]}>
                    {item.commentCount || 0}
                  </Text>
                </TouchableOpacity>
              </View>

              {isOwner(item) && (
                <View style={[styles.ownerActions, { borderTopColor: theme.colors.divider }]}>
                  {config.supportsAnswered && (
                    <TouchableOpacity
                      style={[styles.ownerActionButton, { backgroundColor: theme.colors.surface }]}
                      onPress={() => handleToggleAnswered(item)}
                    >
                      <Ionicons
                        name={item.answered ? 'close-circle-outline' : 'checkmark-circle-outline'}
                        size={18}
                        color={item.answered ? theme.colors.danger : theme.colors.success}
                      />
                      <Text style={[
                        styles.ownerActionText,
                        { color: item.answered ? theme.colors.danger : theme.colors.success }
                      ]}>
                        {item.answered ? 'Mark Unanswered' : 'Mark Answered'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.ownerActionButton,
                      { backgroundColor: `${theme.colors.danger}15` },
                      !config.supportsAnswered && styles.ownerActionButtonFull
                    ]}
                    onPress={() => handleDeletePost(item)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.danger}
                    />
                    <Text style={[styles.ownerActionText, { color: theme.colors.danger }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={config.emptyIcon} size={64} color={theme.colors.secondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {config.emptyTitle}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {config.emptySubtitle}
              </Text>
            </View>
          }
        />

        {/* Comments Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <StatusBar
              backgroundColor={theme.colors.card}
              barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
            />
            <View style={[styles.modalHeader, {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.divider,
              paddingTop: Platform.OS === 'ios' ? 50 : Constants.statusBarHeight + 5,
              ...getShadowStyle(theme)
            }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Comments</Text>
              <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {selectedPost && (
                <View style={[
                  styles.originalPost,
                  {
                    backgroundColor: theme.colors.card,
                    borderLeftColor: theme.colors.primary,
                    ...getShadowStyle(theme)
                  }
                ]}>
                  <View style={styles.postHeader}>
                    <View style={styles.userInfo}>
                      <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.avatarText}>{renderAvatarInitial(selectedPost)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.username, { color: theme.colors.text }]}>
                          {renderUsername(selectedPost)}
                        </Text>
                        <Text style={[styles.postDate, { color: theme.colors.textSecondary }]}>
                          {formatRelativeDate(selectedPost.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {config.supportsAnswered && selectedPost.answered && (
                      <View style={[styles.answeredBadge, { backgroundColor: theme.colors.success }]}>
                        <Text style={styles.answeredText}>Answered</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.originalPostText, { color: theme.colors.text }]}>
                    {selectedPost.text}
                  </Text>
                </View>
              )}

              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.commentsList}
                ListHeaderComponent={
                  comments.length > 0 ? (
                    <Text style={[styles.commentsCount, { color: theme.colors.textSecondary }]}>
                      {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                    </Text>
                  ) : null
                }
                renderItem={({ item }) => (
                  <View style={[
                    styles.commentItem,
                    {
                      backgroundColor: user?.uid === item.userId
                        ? `${theme.colors.primary}15`
                        : theme.colors.card,
                      borderLeftColor: user?.uid === item.userId
                        ? theme.colors.primary
                        : theme.colors.border
                    }
                  ]}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentUser}>
                        <View style={[
                          styles.smallAvatarCircle,
                          {
                            backgroundColor: user?.uid === item.userId
                              ? theme.colors.primary
                              : theme.colors.secondary
                          }
                        ]}>
                          <Text style={styles.smallAvatarText}>
                            {(item.username || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
                          {item.username || 'User'}
                        </Text>
                      </View>

                      {user?.uid === item.userId && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(item.id, item.userId)}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.commentText, { color: theme.colors.text }]}>
                      {item.text}
                    </Text>
                    <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>
                      {formatRelativeDate(item.createdAt)}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyCommentsContainer}>
                    <Ionicons name="chatbubble-outline" size={40} color={theme.colors.secondary} />
                    <Text style={[styles.emptyCommentsText, { color: theme.colors.textSecondary }]}>
                      No comments yet. Be the first to comment!
                    </Text>
                  </View>
                }
              />

              <View style={[
                styles.commentInputContainer,
                {
                  borderTopColor: theme.colors.divider,
                  backgroundColor: theme.colors.card
                }
              ]}>
                <TextInput
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }
                  ]}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Write a comment..."
                  placeholderTextColor={theme.colors.secondary}
                  multiline
                  maxLength={LIMITS.COMMENT_MAX_LENGTH}
                />
                <TouchableOpacity
                  style={[
                    styles.postButton,
                    { backgroundColor: theme.colors.primary },
                    (submitting || !newComment.trim()) && { opacity: 0.5 }
                  ]}
                  onPress={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

// Helper function for consistent shadow styling
const getShadowStyle = (theme: any) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 3,
    };
  } else {
    return {
      elevation: 3,
    };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    padding: 16,
    borderRadius: 0,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 0,
  },
  input: {
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    margin: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  postItem: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 0,
    overflow: 'hidden',
  },
  answeredPost: {
    borderLeftWidth: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
  },
  answeredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answeredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  postText: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  interactionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  interactionText: {
    marginLeft: 4,
    fontSize: 14,
  },
  ownerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderTopWidth: 1,
  },
  ownerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  ownerActionButtonFull: {
    flex: 1,
  },
  ownerActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  message: {
    padding: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originalPost: {
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  originalPostText: {
    fontSize: 16,
    lineHeight: 24,
    padding: 12,
  },
  commentsList: {
    padding: 16,
    paddingBottom: 80,
  },
  commentsCount: {
    fontSize: 14,
    marginBottom: 12,
  },
  commentItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  smallAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 14,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  commentDate: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyCommentsText: {
    marginTop: 8,
    textAlign: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  anonymousToggle: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  anonymousLabel: {
    fontSize: 14,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});

export default CommunityBoard;

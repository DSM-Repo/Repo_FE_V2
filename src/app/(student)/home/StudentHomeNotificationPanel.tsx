'use client'

import { useEffect, useState, type ReactElement } from 'react'

import { getSavedAccessToken } from '@/features/auth/api'
import {
  getNotifications,
  markNotificationRead,
  removeNotification,
  type NotificationItem,
  type NotificationListResult,
} from '@/features/notification/api'

import styles from './page.module.css'

type NotificationLoadState =
  | {
      readonly kind: 'idle'
    }
  | {
      readonly kind: 'loading'
    }
  | {
      readonly kind: 'success'
      readonly notifications: readonly NotificationItem[]
    }
  | {
      readonly kind: 'failure'
      readonly message: string
    }

function toNotificationFailureMessage(result: Exclude<NotificationListResult, { readonly kind: 'success' }>) {
  return result.message
}

function formatNotificationTime(value: string) {
  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return ''
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(timestamp))
}

function toNotificationItemClassName(notification: NotificationItem) {
  return notification.isRead ? styles.notificationItem : `${styles.notificationItem} ${styles.unreadNotificationItem}`
}

export function StudentHomeNotificationPanel(): ReactElement {
  const [notificationState, setNotificationState] = useState<NotificationLoadState>({ kind: 'idle' })
  const [notificationActionMessage, setNotificationActionMessage] = useState('')
  const notifications = notificationState.kind === 'success' ? notificationState.notifications : []

  useEffect(() => {
    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      return
    }

    let isActive = true

    const loadNotifications = async () => {
      setNotificationState({ kind: 'loading' })

      const result = await getNotifications({ accessToken })

      if (!isActive) {
        return
      }

      if (result.kind === 'success') {
        setNotificationState({
          kind: 'success',
          notifications: result.notifications,
        })
        return
      }

      setNotificationState({ kind: 'failure', message: toNotificationFailureMessage(result) })
    }

    void loadNotifications()

    return () => {
      isActive = false
    }
  }, [])

  const handleNotificationRead = async (notification: NotificationItem) => {
    const accessToken = getSavedAccessToken()

    if (!accessToken || notification.isRead) {
      return
    }

    setNotificationActionMessage('')
    const result = await markNotificationRead({ accessToken, alramId: notification.alramId })

    if (result.kind !== 'success') {
      setNotificationActionMessage(result.message)
      return
    }

    setNotificationState((currentState) => {
      if (currentState.kind !== 'success') {
        return currentState
      }

      return {
        kind: 'success',
        notifications: currentState.notifications.map((currentNotification) =>
          currentNotification.alramId === notification.alramId
            ? {
                ...currentNotification,
                isRead: result.isRead,
              }
            : currentNotification,
        ),
      }
    })
  }

  const handleNotificationDelete = async (notification: NotificationItem) => {
    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      return
    }

    setNotificationActionMessage('')
    const result = await removeNotification({ accessToken, alramId: notification.alramId })

    if (result.kind !== 'success') {
      setNotificationActionMessage(result.message)
      return
    }

    setNotificationState((currentState) => {
      if (currentState.kind !== 'success') {
        return currentState
      }

      return {
        kind: 'success',
        notifications: currentState.notifications.filter(
          (currentNotification) => currentNotification.alramId !== notification.alramId,
        ),
      }
    })
  }

  return (
    <section className={styles.notificationPanel} aria-labelledby="notifications-title">
      <h2 id="notifications-title">알림 목록</h2>
      {notificationState.kind === 'loading' || notificationState.kind === 'idle' ? (
        <p className={styles.emptyMessage}>알림을 불러오는 중입니다.</p>
      ) : null}
      {notificationState.kind === 'failure' ? <p className={styles.emptyMessage}>{notificationState.message}</p> : null}
      {notificationState.kind === 'success' && notifications.length === 0 ? (
        <p className={styles.emptyMessage}>새 알림이 없습니다.</p>
      ) : null}
      {notificationState.kind === 'success' && notifications.length > 0 ? (
        <ul className={styles.notificationList}>
          {notifications.map((notification) => (
            <li className={toNotificationItemClassName(notification)} key={notification.alramId}>
              <span className={styles.notificationContent}>{notification.content}</span>
              <time dateTime={notification.createdAt}>{formatNotificationTime(notification.createdAt)}</time>
              <div className={styles.notificationActions}>
                <button
                  type="button"
                  disabled={notification.isRead}
                  onClick={() => {
                    void handleNotificationRead(notification)
                  }}
                >
                  읽음
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleNotificationDelete(notification)
                  }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {notificationActionMessage ? <p className={styles.notificationActionMessage}>{notificationActionMessage}</p> : null}
    </section>
  )
}

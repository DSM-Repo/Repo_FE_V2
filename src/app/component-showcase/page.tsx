import styles from './page.module.css'

export default function ComponentShowcasePage() {
  return (
    <main className={styles.page}>
      <section className={styles.section} aria-labelledby="component-showcase-title">
        <h1 className={styles.sectionTitle} id="component-showcase-title">
          컴포넌트 쇼케이스
        </h1>
        <p className={styles.emptyMessage}>표시할 컴포넌트 예시가 없습니다.</p>
      </section>
    </main>
  )
}

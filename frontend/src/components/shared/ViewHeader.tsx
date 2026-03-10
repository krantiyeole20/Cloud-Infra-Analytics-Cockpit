interface Props {
  title: string
  subtitle: string
  action?: React.ReactNode
}

export default function ViewHeader({ title, subtitle, action }: Props) {
  return (
    <div className="view-header-shared">
      <div className="view-header-text">
        <h1 className="view-title">{title}</h1>
        <p className="view-subtitle">{subtitle}</p>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

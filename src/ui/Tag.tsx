import React from 'react'

interface TagProps {
    color: string
    tagName: string
    className?: string
}
export const Tag = (props: TagProps) => {
    const { color, tagName, className } = props

  return (
    <div className={`border-${color} bg-${color}/20  border rounded-2xl px-3 py-0.5 text-sm text-white w-max ${className}`}>
        {tagName}
    </div>
  )
}

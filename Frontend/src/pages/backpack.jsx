import React from 'react'
import CategoryProducts from './CategoryProducts'

export default function Backpack({ navigate }) {
  return <CategoryProducts navigate={navigate} categorySlug="backpack" pageTitle="BACKPACK" />
}

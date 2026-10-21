import badmintonImage from '../../assets/badminton.jpg'
import egamesImage from '../../assets/egames.jpg'
import heroImage from '../../assets/hero.png'

export const newsFeedImages = {
  badminton: badmintonImage,
  egames: egamesImage,
  hero: heroImage,
}

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
})

export const formatNewsDate = (value) => value ? dateFormatter.format(new Date(value)) : ''

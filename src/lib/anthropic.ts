import Anthropic from '@anthropic-ai/sdk'
import { MoodAnalysis } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeMood(text: string): Promise<MoodAnalysis> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `다음 일기/감정 텍스트를 분석해서 JSON 형식으로만 응답해줘. 다른 텍스트는 절대 포함하지 마.

텍스트: "${text}"

응답 형식:
{
  "emotion": "주요 감정 (기쁨/슬픔/분노/불안/평온/설렘/피곤 중 하나)",
  "intensity": 감정강도 (1-10 숫자),
  "keywords": ["감정키워드1", "감정키워드2", "감정키워드3"],
  "genre": ["음악장르1", "음악장르2"],
  "tempo": "slow 또는 medium 또는 fast",
  "energy": "low 또는 medium 또는 high",
  "summary": "감정 한줄 요약 (20자 이내)"
}`,
      },
    ],
  })

const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // 코드블록 제거
  const cleaned = content.text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(cleaned)
  return parsed as MoodAnalysis
}
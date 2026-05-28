import os
from typing import Optional
import anthropic
from app.models.schemas import LinkResult


async def get_ai_suggestions(
    broken_links: list[LinkResult],
    api_key: Optional[str] = None,
) -> list[LinkResult]:
    if not broken_links:
        return broken_links

    key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        return broken_links

    try:
        client = anthropic.Anthropic(api_key=key)

        for link in broken_links[:5]:
            if link.status in ("broken", "out_of_stock") and link.anchor_text:
                prompt = (
                    f"A broken affiliate link needs a replacement suggestion.\n\n"
                    f'Anchor text: "{link.anchor_text}"\n'
                    f'Context: "{link.context}"\n'
                    f"Original URL: {link.url}\n"
                    f"Status: {link.status}\n\n"
                    "Provide ONE concise suggestion (max 2 sentences) for "
                    "what replacement product or search query the user should "
                    "look for. Be specific and actionable. "
                    "Do not mention the broken URL."
                )

                message = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=150,
                    messages=[{"role": "user", "content": prompt}],
                )
                link.ai_suggestion = message.content[0].text.strip()

    except Exception:
        pass

    return broken_links

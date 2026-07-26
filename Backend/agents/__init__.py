"""AI agents package — foundation, review agents, and orchestration."""

from agents.base_agent import AgentResult, BaseAIAgent, HelloFoundationAgent
from agents.crews.hello_crew import build_hello_crew, run_hello_crew
from agents.crews.review_crew import build_review_crew
from agents.intelligence import ReviewIntelligence, SummaryAgent
from agents.orchestration import AggregatedReview, ReviewContext, ReviewOrchestrator
from agents.review import (
    ArchitectureReviewAgent,
    SecurityReviewAgent,
    StyleReviewAgent,
    TestingReviewAgent,
)

__all__ = [
    "AgentResult",
    "AggregatedReview",
    "ArchitectureReviewAgent",
    "BaseAIAgent",
    "HelloFoundationAgent",
    "ReviewContext",
    "ReviewIntelligence",
    "ReviewOrchestrator",
    "SecurityReviewAgent",
    "StyleReviewAgent",
    "SummaryAgent",
    "TestingReviewAgent",
    "build_hello_crew",
    "build_review_crew",
    "run_hello_crew",
]

import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.11.1", (api) => {
  function injectSchema() {
    const topicController = api.container.lookup("controller:topic");
    const topic = topicController?.model;
    if (!topic) return;

    const firstPost = topic.postStream.posts[0];
    if (!firstPost) return;

    const tags = topic.tags || [];
    const cf = firstPost.custom_fields || {};
    const structuredType = cf.structured_type || null;

    let schemaType = null;
    if (tags.includes("faq") || structuredType === "faq") {
      schemaType = "FAQPage";
    } else if (
      tags.includes("q&a") ||
      structuredType === "qa" ||
      structuredType === "qapage"
    ) {
      schemaType = "QAPage";
    } else if (structuredType === "article" || tags.includes("article")) {
      schemaType = "Article";
    } else {
      schemaType = "Article";
    }

    let jsonLd = null;
    const authorUrl = `https://${window.location.host}/u/${firstPost.username}`;

    if (schemaType === "FAQPage") {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: topic.title,
            acceptedAnswer: {
              "@type": "Answer",
              text:
                firstPost.excerpt ||
                firstPost.cooked.replace(/<[^>]+>/g, "").slice(0, 300),
            },
          },
        ],
      };
    } else if (schemaType === "QAPage") {
      jsonLd = {
        "@context": "http://schema.org",
        "@type": "QAPage",
        name: topic.title,
        mainEntity: {
          "@type": "Question",
          name: topic.title,
          text:
            firstPost.excerpt ||
            firstPost.cooked.replace(/<[^>]+>/g, "").slice(0, 300),
          upvoteCount: firstPost.likeCount || 0,
          answerCount: topic.postsCount - 1,
          datePublished: firstPost.createdAt,
          author: {
            "@type": "Person",
            name: firstPost.username,
            url: authorUrl,
          },
        },
      };
    } else if (schemaType === "Article") {
      jsonLd = {
        "@context": "http://schema.org",
        "@type": "Article",
        headline: topic.title,
        author: {
          "@type": "Person",
          name: firstPost.username,
          url: authorUrl,
        },
        datePublished: firstPost.createdAt,
        articleBody:
          firstPost.excerpt ||
          firstPost.cooked.replace(/<[^>]+>/g, "").slice(0, 300),
      };
    }

    if (!jsonLd) return;

    // 删除之前的
    document.querySelectorAll('script[data-structured-json="true"]').forEach((el) =>
      el.remove()
    );

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.structuredJson = "true";
    script.textContent = JSON.stringify(jsonLd, null, 2);
    document.head.appendChild(script);
  }

  // 第一次页面渲染
  api.onAppEvent("page:changed", injectSchema);

  // 确保初次加载也执行
  injectSchema();
});

package org.capsc.pdf.template.dto;

import lombok.Builder;
import lombok.Getter;
import org.capsc.pdf.template.entity.Template;

import java.time.LocalDateTime;

@Getter
@Builder
public class TemplateListResponse {
    private Long id;
    private String name;
    private String description;
    private boolean isPublic;
    private String pdfFilePath;
    private String pdfImagePath;
    private String pdfImageUrl;
    private LocalDateTime createdAt;

    public static TemplateListResponse templateListResponse(Template template) {
         return TemplateListResponse.builder()
                 .id(template.getId())
                 .name(template.getName())
                 .description(template.getDescription())
                 .isPublic(template.getIsPublic())
                 .pdfFilePath(template.getPdfFilePath())
                 .pdfImagePath(template.getPdfImagePath())
                 .pdfImageUrl(template.getPdfImageUrl())
                 .createdAt(template.getCreatedDate())
                 .build();
    }
}

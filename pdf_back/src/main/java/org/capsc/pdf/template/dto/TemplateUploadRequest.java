// TemplateDto.java
package org.capsc.pdf.template.dto;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateUploadRequest {
    private UUID userId;
    private String name;
    private String description;
    private boolean isPublic;
}

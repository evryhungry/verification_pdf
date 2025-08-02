package org.capsc.pdf.template.service;

import org.capsc.pdf.template.dto.TemplateUploadRequest;
import org.capsc.pdf.template.dto.TemplateListResponse;
import org.capsc.pdf.template.entity.Template;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface TemplateService {
    Template uploadTemplate(MultipartFile pdf, TemplateUploadRequest dto);
    List<TemplateListResponse> getAllTemplates(UUID userId);
}

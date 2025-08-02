package org.capsc.pdf.template.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.capsc.pdf.template.dto.TemplateListResponse;
import org.capsc.pdf.template.dto.TemplateUploadRequest;
import org.capsc.pdf.template.service.TemplateService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    /**
     * 템플릿 업로드 (PDF + 이름/설명)
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadTemplate(
            @RequestPart("pdf") MultipartFile pdfFile,
            @RequestPart("request") String requestJson  // ← JSON String으로 받기
    ) {
        try {
            TemplateUploadRequest dto = new ObjectMapper().readValue(requestJson, TemplateUploadRequest.class);
            templateService.uploadTemplate(pdfFile, dto);
            return ResponseEntity.ok("등록 완료");
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest().body("JSON 파싱 실패: " + e.getMessage());
        }
    }

    /**
     * 템플릿 전체 리스트 조회
     */
    @GetMapping
    public ResponseEntity<List<TemplateListResponse>> getAllTemplates(@RequestParam("userId") UUID userId) {
        List<TemplateListResponse> templates = templateService.getAllTemplates(userId);
        return ResponseEntity.ok(templates);
    }
}
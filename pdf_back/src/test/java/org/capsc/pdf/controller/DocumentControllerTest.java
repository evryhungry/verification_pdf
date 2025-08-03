package org.capsc.pdf.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.capsc.pdf.document.entity.Document;
import org.capsc.pdf.document.entity.Document.DocumentStatus;
import org.capsc.pdf.document.repository.DocumentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.capsc.pdf.template.repository.TemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/documents/{id}/with-template - 성공 케이스")
    void getDocumentWithTemplateSuccess() throws Exception {
        // given
        // 먼저 테스트용 Template, Document 엔티티를 저장합니다.
        var template = templateRepository.save(
                org.capsc.pdf.template.entity.Template.builder()
                        .userid(UUID.randomUUID())
                        .name("Test Template")
                        .description("설명")
                        .pdfFilePath("uploads/pdf/sample.pdf")
                        .pdfImagePath("uploads/image/sample.jpg")
                        .isPublic(true)
                        .build()
        );

        var document = documentRepository.save(
                Document.builder()
                        .templateId(template.getId())
                        .data("{\"key\": \"value\"}")
                        .status(DocumentStatus.EDITING)
                        .deadline(LocalDateTime.now().plusDays(3))
                        .build()
        );

        // when & then
        mockMvc.perform(get("/api/documents/" + document.getId() + "/with-template"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.templateName").value("Test Template"))
                .andExpect(jsonPath("$.pdfUrl").value("/static/pdf/sample.pdf"))
                .andExpect(jsonPath("$.imageUrl").value("/static/image/sample.jpg"))
                .andExpect(jsonPath("$.document.id").value(document.getId()));
    }
}